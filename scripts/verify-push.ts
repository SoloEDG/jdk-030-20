import { PUSH_LEVELS, hydrate } from "../src/features/voyage/lib/catalog";
import { applyMove } from "../src/features/hauler/lib/push";
import { evaluateGadgets } from "../src/features/gadget/lib/power";
import { goalsSatisfied } from "../src/features/ledger/lib/win";
import type { GameDocument } from "../src/shared/types";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) { failures += 1; console.error("FAIL:", m); } };

for (const blueprint of PUSH_LEVELS) {
  const level = hydrate(blueprint);
  const doc: GameDocument = { version: 1, currentLevelId: level.id, level, attempt: { steps: 0, status: "playing" }, records: {} };
  evaluateGadgets(doc);
  // Every push level must leave the board clear of echo state and be walkable.
  assert(level.mode === "push", `${level.id} mode`);
  assert(level.baffles.length === 0, `${level.id} has baffles`);
  assert(level.routes.length === 0, `${level.id} has routes`);
  // A single blocked move must not count as movement.
  const start = { ...level.player };
  // Try moving into the wall to the north.
  const blocked = applyMove(doc, "n");
  if (!blocked.moved) assert(doc.level.player.x === start.x && doc.level.player.y === start.y, `${level.id} player moved on block`);
  assert(!goalsSatisfied(doc), `${level.id} already solved`);
}
if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log("\npush regression checks passed");
