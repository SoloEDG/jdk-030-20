import type { EchoScenario, Plate, RuntimeLevel } from "@/shared/types";
import { ambiguousPairs, doorsDistinct, readDoor, type EarReading } from "./acoustics";

/** Boards raised by whichever plates are occupied right now. */
export function raisedBoards(plates: Plate[], occupied: Iterable<string>): Set<string> {
  const held = new Set(occupied);
  const raised = new Set<string>();
  for (const plate of plates) {
    if (!held.has(plate.id)) continue;
    for (const boardId of plate.boardIds) raised.add(boardId);
  }
  return raised;
}

/** Doors opened by whichever plates are occupied right now. */
export function openDoors(plates: Plate[], occupied: Iterable<string>): string[] {
  const held = new Set(occupied);
  const ids = new Set<string>();
  for (const plate of plates) {
    if (!held.has(plate.id)) continue;
    for (const doorId of plate.doorIds) ids.add(doorId);
  }
  return [...ids];
}

/** Plates currently carrying a matching box. */
export function occupiedPlates(level: RuntimeLevel): string[] {
  const out: string[] = [];
  for (const plate of level.plates) {
    const held = level.boxes.some(
      (box) => box.x === plate.x && box.y === plate.y && box.kind === plate.accept,
    );
    if (held) out.push(plate.id);
  }
  return out;
}

/** Board ids the player has stuck a strip on. */
export function strippedBoardIds(level: RuntimeLevel): Set<string> {
  return new Set(level.baffles.filter((b) => b.stripped).map((b) => b.id));
}

/** Boards that can ever stand during a stated scenario — the only worthwhile strip targets. */
export function eligibleBaffles(level: RuntimeLevel): string[] {
  const plateById = new Map(level.plates.map((plate) => [plate.id, plate]));
  const ids = new Set<string>();
  for (const scenario of level.scenarios) {
    for (const plateId of scenario.plates) {
      const plate = plateById.get(plateId);
      if (plate) for (const boardId of plate.boardIds) ids.add(boardId);
    }
  }
  return level.baffles.filter((b) => ids.has(b.id)).map((b) => b.id);
}

export interface SceneFailure {
  scenarioId: string;
  postId: string;
  freq: number;
  pairs: [string, string][];
  readings: Map<string, EarReading>;
}

export interface StripCheck {
  ok: boolean;
  used: number;
  failures: SceneFailure[];
}

/**
 * Whether a strip set makes every stated combo distinguishable at every post,
 * every candidate door and every pitch.
 *
 * `strips` holds board ids. A strip only quietens a bounce while its board is up,
 * which the engine already enforces.
 */
export function checkStrips(
  level: RuntimeLevel,
  strips: Iterable<string>,
): StripCheck {
  const stripSet = new Set(strips);
  const failures: SceneFailure[] = [];
  for (const scenario of level.scenarios) {
    const raised = raisedBoards(level.plates, scenario.plates);
    for (const postId of scenario.postIds) {
      for (const freq of level.poles) {
        const readings = new Map<string, EarReading>();
        for (const doorId of scenario.doorIds) {
          readings.set(doorId, readDoor(level.routes, doorId, postId, freq, raised, stripSet));
        }
        if (!doorsDistinct(readings, level.tolerance)) {
          failures.push({
            scenarioId: scenario.id,
            postId,
            freq,
            pairs: ambiguousPairs(readings, level.tolerance),
            readings,
          });
          break;
        }
      }
    }
  }
  return { ok: failures.length === 0, used: stripSet.size, failures };
}

export interface ReadingTable {
  scenario: EchoScenario;
  postId: string;
  /** freq -> doorId -> reading */
  cells: { freq: number; doors: { doorId: string; reading: EarReading }[] }[];
  ambiguous: { freq: number; pair: [string, string] }[];
}

/** Full L/R table for the panel; two doors per pitch may overlap when strips are wrong. */
export function readingTable(
  level: RuntimeLevel,
  scenario: EchoScenario,
  postId: string,
  strips: Iterable<string>,
): ReadingTable {
  const stripSet = new Set(strips);
  const raised = raisedBoards(level.plates, scenario.plates);
  const cells: ReadingTable["cells"] = [];
  const ambiguous: ReadingTable["ambiguous"] = [];
  for (const freq of level.poles) {
    const doors = scenario.doorIds.map((doorId) => ({
      doorId,
      reading: readDoor(level.routes, doorId, postId, freq, raised, stripSet),
    }));
    const map = new Map(doors.map((d) => [d.doorId, d.reading]));
    for (const pair of ambiguousPairs(map, level.tolerance)) ambiguous.push({ freq, pair });
    cells.push({ freq, doors });
  }
  return { scenario, postId, cells, ambiguous };
}

/** Smallest strip count that satisfies every scenario; used to verify the level. */
export function minimumStrips(level: RuntimeLevel): { budget: number | null; solutions: string[][] } {
  const eligible = eligibleBaffles(level);
  if (checkStrips(level, []).ok) return { budget: 0, solutions: [[]] };
  for (let k = 1; k <= eligible.length; k++) {
    const solutions: string[][] = [];
    for (const combo of combinations(eligible, k)) {
      if (checkStrips(level, combo).ok) solutions.push(combo);
    }
    if (solutions.length) return { budget: k, solutions };
  }
  return { budget: null, solutions: [] };
}

export function combinations<T>(items: T[], k: number): T[][] {
  const out: T[][] = [];
  const walk = (start: number, picked: T[]) => {
    if (picked.length === k) {
      out.push([...picked]);
      return;
    }
    for (let i = start; i < items.length; i++) {
      picked.push(items[i]);
      walk(i + 1, picked);
      picked.pop();
    }
  };
  walk(0, []);
  return out;
}

/**
 * Whether stripping strips makes some ear louder for some door — the trap this
 * level is built around. Returns the clearest example, or null.
 */
export function louderAfterStrip(
  level: RuntimeLevel,
  scenario: EchoScenario,
  postId: string,
  strips: Iterable<string>,
): { doorId: string; ear: "L" | "R"; freq: number; before: number; after: number } | null {
  const stripSet = new Set(strips);
  const raised = raisedBoards(level.plates, scenario.plates);
  for (const freq of level.poles) {
    for (const doorId of scenario.doorIds) {
      const withStrips = readDoor(level.routes, doorId, postId, freq, raised, stripSet);
      const without = readDoor(level.routes, doorId, postId, freq, raised, new Set());
      if (withStrips.L > without.L + 0.05) {
        return { doorId, ear: "L", freq, before: without.L, after: withStrips.L };
      }
      if (withStrips.R > without.R + 0.05) {
        return { doorId, ear: "R", freq, before: without.R, after: withStrips.R };
      }
    }
  }
  return null;
}
