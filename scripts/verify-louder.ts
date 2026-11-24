import { ECHO_LEVELS } from "../src/features/echo/lib/data";
import { hydrateEcho } from "../src/features/echo/lib/catalog";
import { checkStrips, louderAfterStrip } from "../src/features/echo/lib/solver";

let failures = 0;
function assert(c: boolean, m: string) {
  if (!c) { failures += 1; console.error("FAIL:", m); }
}

// At the proven solution, at least one scenario/post must show a strip making an ear louder.
for (const data of ECHO_LEVELS) {
  const level = hydrateEcho(data);
  let found = false;
  for (const scenario of level.scenarios) {
    for (const postId of scenario.postIds) {
      const example = louderAfterStrip(level, scenario, postId, data.solution);
      if (example) {
        found = true;
        console.log(`  ${data.id} ${scenario.id}@${postId}: ${example.doorId} ${example.ear} ${example.before.toFixed(2)} -> ${example.after.toFixed(2)} dB`);
      }
    }
  }
  assert(found, `${data.id} never shows a louder-after-strip counterexample`);
  // And the stored gainExample must match an actual engine reading.
  assert(checkStrips(level, data.solution).ok, `${data.id} solution fails`);
}

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log("\nall louder-after-strip checks passed");
