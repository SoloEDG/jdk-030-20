import { ref } from "vue";
import { ECHO_LEVELS } from "../src/features/echo/lib/data";
import { hydrateEcho } from "../src/features/echo/lib/catalog";
import { useEcho } from "../src/features/echo/model/useEcho";
import { checkStrips, eligibleBaffles } from "../src/features/echo/lib/solver";
import { evaluateGadgets } from "../src/features/gadget/lib/power";
import type { GameDocument } from "../src/shared/types";

let failures = 0;
function assert(c: boolean, m: string) { if (!c) { failures += 1; console.error("FAIL:", m); } }

for (const data of ECHO_LEVELS) {
  const level = hydrateEcho(data);
  const doc: GameDocument = { version: 1, currentLevelId: level.id, level, attempt: { steps: 0, status: "playing" }, records: {} };
  for (const plate of level.plates) {
    const box = level.boxes.find((b) => b.x === plate.x && b.y === plate.y + 1);
    if (box) { box.x = plate.x; box.y = plate.y; }
  }
  evaluateGadgets(doc);
  const echo = useEcho(ref(doc));
  const post = level.posts[0];
  level.player = { x: post.x, y: post.y };

  // Empty strips: the level must be distinguishable? No — the level is only valid
  // with the minimum, so delivery must refuse.
  const none = echo.beginDelivery();
  assert(!none.ok, `${data.id} delivery allowed with zero strips`);

  // Wrong boards at full budget: use the same budget on non-solution boards,
  // which must fail (either checkStrips or delivery).
  const eligible = eligibleBaffles(level);
  const wrong = eligible.filter((id) => !data.solution.includes(id)).slice(0, data.stripBudget);
  if (wrong.length === data.stripBudget) {
    for (const b of wrong) echo.toggleStrip(b);
    assert(!checkStrips(level, wrong).ok, `${data.id} wrong budget-sized set passed check`);
    const refused = echo.beginDelivery();
    assert(!refused.ok, `${data.id} delivery allowed on wrong board set`);
  }
}
if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log("\nwrong-placement checks passed");
