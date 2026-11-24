import { ref } from "vue";
import { ECHO_LEVELS } from "../src/features/echo/lib/data";
import { hydrateEcho } from "../src/features/echo/lib/catalog";
import { useEcho } from "../src/features/echo/model/useEcho";
import { evaluateGadgets } from "../src/features/gadget/lib/power";
import { markCleared } from "../src/features/ledger/lib/steps";
import type { GameDocument } from "../src/shared/types";

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures += 1;
    console.error("FAIL:", msg);
  }
}

for (const data of ECHO_LEVELS) {
  const level = hydrateEcho(data);
  const doc: GameDocument = {
    version: 1,
    currentLevelId: level.id,
    level,
    attempt: { steps: 4, status: "playing" },
    records: {},
  };
  // Deliver all boxes to plates by teleport (physics already tested elsewhere).
  for (const plate of level.plates) {
    const box = level.boxes.find((b) => b.x === plate.x && b.y === plate.y + 1);
    if (!box) continue;
    box.x = plate.x;
    box.y = plate.y;
  }
  evaluateGadgets(doc);
  const document = ref(doc);
  const echo = useEcho(document);

  assert(echo.isEcho.value, `${data.id} not echo`);
  assert(echo.budget.value === data.stripBudget, `${data.id} budget ${echo.budget.value}`);

  // Try to over-fill: after budget strips, toggling another must fail.
  for (const board of data.solution) {
    assert(echo.toggleStrip(board), `${data.id} could not strip ${board}`);
  }
  const other = level.baffles.map((b) => b.id).find((id) => !data.solution.includes(id));
  if (other) assert(!echo.toggleStrip(other), `${data.id} allowed over-budget strip`);
  assert(echo.check.value.ok, `${data.id} solution strip check not ok`);

  // Stand on a post and deliver.
  const post = level.posts[0];
  document.value.level.player = { x: post.x, y: post.y };
  const begin = echo.beginDelivery();
  assert(begin.ok, `${data.id} delivery did not start: ${begin.message}`);
  assert(!!echo.delivery.value, `${data.id} no challenge`);
  const challenge = echo.delivery.value!;
  const wrong = challenge.candidates.find((d) => d !== challenge.trueDoorId);
  if (wrong) {
    const bad = echo.answerDoor(wrong);
    assert(!bad.ok && !bad.cleared, `${data.id} wrong door accepted`);
  }
  // The jittered reading must still land nearest the true door.
  const byIld = [...challenge.table.entries()]
    .map(([doorId, reading]) => ({ doorId, distance: Math.abs(reading.ild - challenge.heardIld) }))
    .sort((a, b) => a.distance - b.distance);
  assert(byIld[0].doorId === challenge.trueDoorId,
    `${data.id} jittered reading ${challenge.heardIld.toFixed(2)} ambiguous: nearest ${byIld[0].doorId}`);

  const good = echo.answerDoor(challenge.trueDoorId);
  assert(good.ok && good.cleared, `${data.id} right door rejected`);
  assert(markCleared(document.value), `${data.id} markCleared failed`);

  // Without standing on a post, delivery must refuse.
  document.value.attempt.status = "playing";
  document.value.level.player = { x: 5, y: 7 };
  echo.cancelDelivery();
  const refused = echo.beginDelivery();
  assert(!refused.ok, `${data.id} delivery allowed off-post`);
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall model checks passed");
