import { ECHO_LEVELS } from "../src/features/echo/lib/data";
import { hydrateEcho } from "../src/features/echo/lib/catalog";
import { applyMove } from "../src/features/hauler/lib/push";
import { evaluateGadgets } from "../src/features/gadget/lib/power";
import { checkStrips, occupiedPlates, openDoors, raisedBoards } from "../src/features/echo/lib/solver";
import { readDoor } from "../src/features/echo/lib/acoustics";
import type { Dir, GameDocument, RuntimeLevel } from "../src/shared/types";

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures += 1;
    console.error("FAIL:", msg);
  }
}

function docOf(level: RuntimeLevel): GameDocument {
  return { version: 1, currentLevelId: level.id, level, attempt: { steps: 0, status: "playing" }, records: {} };
}

function same(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9;
}

function sharedEdge(a: { x: number; y: number }, b: { x: number; y: number }) {
  if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1) return null;
  if (a.y === b.y) {
    const x = Math.max(a.x, b.x);
    return { p: { x, y: a.y }, q: { x, y: a.y + 1 } };
  }
  const y = Math.max(a.y, b.y);
  return { p: { x: a.x, y }, q: { x: a.x + 1, y } };
}

function segmentOf(b: { x: number; y: number; side: string }) {
  switch (b.side) {
    case "n": return { a: { x: b.x, y: b.y }, b: { x: b.x + 1, y: b.y } };
    case "s": return { a: { x: b.x, y: b.y + 1 }, b: { x: b.x + 1, y: b.y + 1 } };
    case "w": return { a: { x: b.x, y: b.y }, b: { x: b.x, y: b.y + 1 } };
    default: return { a: { x: b.x + 1, y: b.y }, b: { x: b.x + 1, y: b.y + 1 } };
  }
}

function dirBetween(from: { x: number; y: number }, to: { x: number; y: number }): Dir {
  if (to.x === from.x + 1) return "e";
  if (to.x === from.x - 1) return "w";
  if (to.y === from.y + 1) return "s";
  return "n";
}

/** Breadth-first path over free floor with boards and boxes treated as walls. */
function findPath(level: RuntimeLevel, start: { x: number; y: number }, goal: { x: number; y: number }): { x: number; y: number }[] {
  const key = (x: number, y: number) => `${x},${y}`;
  const blocked = new Set(level.boxes.map((b) => key(b.x, b.y)));
  const prev = new Map<string, string | null>([[key(start.x, start.y), null]]);
  const queue = [start];
  while (queue.length) {
    const cell = queue.shift()!;
    if (cell.x === goal.x && cell.y === goal.y) {
      const path: { x: number; y: number }[] = [];
      let k: string | null = key(cell.x, cell.y);
      while (k) {
        const [x, y] = k.split(",").map(Number);
        path.unshift({ x, y });
        k = prev.get(k) ?? null;
      }
      return path;
    }
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
      const nx = cell.x + dx;
      const ny = cell.y + dy;
      if (nx < 0 || ny < 0 || nx >= level.width || ny >= level.height) continue;
      const tile = level.tiles[ny][nx];
      if (tile === "wall" || tile === "gap") continue;
      const k = key(nx, ny);
      if (prev.has(k) || blocked.has(k)) continue;
      // A raised board on the shared edge bars the step.
      let barred = false;
      for (const baffle of level.baffles) {
        if (!baffle.raised) continue;
        const edge = sharedEdge(cell, { x: nx, y: ny });
        const seg = segmentOf(baffle);
        if (edge && ((same(seg.a, edge.p) && same(seg.b, edge.q)) || (same(seg.a, edge.q) && same(seg.b, edge.p)))) barred = true;
      }
      if (barred) continue;
      prev.set(k, key(cell.x, cell.y));
      queue.push({ x: nx, y: ny });
    }
  }
  return [];
}

for (const data of ECHO_LEVELS) {
  const level = hydrateEcho(data);
  const doc = docOf(level);
  assert(level.boxes.length === level.plates.length, `${data.id} box/plate count mismatch`);

  // Push every box north onto the plate above its start using real moves.
  const consumed = new Set<string>();
  for (const plate of level.plates) {
    const box = level.boxes.find((b) => b.x === plate.x && b.y === plate.y + 1 && !consumed.has(b.id));
    if (!box) continue;
    const route = findPath(level, doc.level.player, { x: plate.x, y: plate.y + 2 });
    assert(route.length > 0, `${data.id} no walking route to push ${plate.id}`);
    for (let i = 1; i < route.length; i++) {
      const res = applyMove(doc, dirBetween(route[i - 1], route[i]));
      assert(res.moved, `${data.id} walk step blocked at ${route[i].x},${route[i].y}`);
    }
    const push = applyMove(doc, "n");
    assert(push.moved, `${data.id} push onto ${plate.id} blocked`);
    evaluateGadgets(doc);
    consumed.add(box.id);
  }

  const occ = occupiedPlates(level);
  const doors = openDoors(level.plates, occ);
  console.log(`  ${data.id}: occupied=${occ.join(",")} doors=${doors.join(",")} raisedBoards=${level.baffles.filter((b) => b.raised).length}`);
  assert(occ.length === level.plates.length, `${data.id} not all plates held (${occ.join(",")})`);
  assert(doors.length >= 2, `${data.id} fewer than two doors open`);

  // Walk to every listening post in turn, with all boards up, and confirm the
  // proven strip set separates every door pair there at every pitch.
  const stripped = new Set(data.solution);
  const raised = raisedBoards(level.plates, occ);
  for (const post of level.posts) {
    const toPost = findPath(level, doc.level.player, { x: post.x, y: post.y });
    assert(toPost.length > 0, `${data.id} no walking route to post ${post.id}`);
    for (let i = 1; i < toPost.length; i++) {
      const res = applyMove(doc, dirBetween(toPost[i - 1], toPost[i]));
      assert(res.moved, `${data.id} post route blocked at ${toPost[i].x},${toPost[i].y}`);
    }
    assert(doc.level.player.x === post.x && doc.level.player.y === post.y, `${data.id} did not reach post ${post.id}`);
    for (const freq of level.poles) {
      const readings = doors.map((d) => readDoor(level.routes, d, post.id, freq, raised, stripped));
      for (let i = 0; i < readings.length; i++) {
        for (let j = i + 1; j < readings.length; j++) {
          assert(
            Math.abs(readings[i].ild - readings[j].ild) > 2 * level.tolerance,
            `${data.id} post ${post.id} @${freq}Hz doors ${doors[i]}/${doors[j]} overlap`,
          );
        }
      }
    }
  }
  assert(checkStrips(level, stripped).ok, `${data.id} solution not valid across all scenarios`);
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall play-through checks passed");
