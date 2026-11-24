import { ECHO_LEVELS } from "../src/features/echo/lib/data";
import { hydrateEcho } from "../src/features/echo/lib/catalog";
import { checkStrips, minimumStrips, eligibleBaffles } from "../src/features/echo/lib/solver";
import { readDoor } from "../src/features/echo/lib/acoustics";

let failures = 0;
function assert(cond: boolean, message: string) {
  if (!cond) {
    failures += 1;
    console.error("FAIL:", message);
  }
}

for (const data of ECHO_LEVELS) {
  const level = hydrateEcho(data);
  const eligible = eligibleBaffles(level);
  const { budget, solutions } = minimumStrips(level);
  console.log(
    `${data.id}: eligible=${eligible.length} budget=${budget} solutions=${solutions.length}`,
  );
  assert(budget === data.stripBudget, `${data.id} budget ${budget} != ${data.stripBudget}`);
  assert(
    solutions.some((s) => s.join(",") === data.solution.join(",")),
    `${data.id} stored solution not minimal`,
  );
  // The stored solution must pass and each removal must break it.
  const okSolution = checkStrips(level, data.solution);
  assert(okSolution.ok, `${data.id} stored solution fails`);
  for (const board of data.solution) {
    const reduced = data.solution.filter((b) => b !== board);
    assert(!checkStrips(level, reduced).ok, `${data.id} strip ${board} is redundant`);
  }
  // Fewer strips must always fail (minimum property).
  if (data.solution.length > 0) {
    assert(!checkStrips(level, data.solution.slice(1)).ok, `${data.id} fewer-than-min passed`);
  }
}

// Directly re-derive every stored gainExample from the engine.
for (const data of ECHO_LEVELS) {
  const level = hydrateEcho(data);
  const scenario = level.scenarios.find((s) => s.plates.join(",") === data.gainExample.plates.join(","));
  assert(!!scenario, `${data.id} gainExample scenario missing`);
  if (!scenario) continue;
  const raised = new Set<string>();
  for (const plateId of scenario.plates) {
    const plate = level.plates.find((p) => p.id === plateId);
    if (plate) for (const boardId of plate.boardIds) raised.add(boardId);
  }
  const withStrips = readDoor(level.routes, data.gainExample.door, data.gainExample.post,
    data.gainExample.freq, raised, new Set(data.solution));
  const without = readDoor(level.routes, data.gainExample.door, data.gainExample.post,
    data.gainExample.freq, raised, new Set());
  const ear = data.gainExample.ear as "L" | "R";
  const delta = withStrips[ear] - without[ear];
  assert(delta > 0, `${data.id} gainExample ear not louder: ${delta.toFixed(2)} dB`);
  console.log(
    `  ${data.id} gainExample: ${data.gainExample.ear} ${without[ear].toFixed(2)} -> ${withStrips[ear].toFixed(2)} dB`,
  );
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall echo assertions passed");
