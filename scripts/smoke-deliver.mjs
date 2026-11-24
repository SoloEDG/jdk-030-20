// End-to-end: mount the app, select an echo level, shove both boxes onto their
// plates with real key presses, walk to the listening post, stick the proven
// strip, and answer the blind delivery. Proves the whole loop wires together.
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/", runScripts: "outside-only", pretendToBeVisual: true,
});
const w = dom.window;
w.process = { env: { NODE_ENV: "production" } };
const store = new Map();
Object.defineProperty(w, "localStorage", {
  value: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v), removeItem: (k) => void store.delete(k) },
});
const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
w.HTMLCanvasElement.prototype.getContext = () => ctx;
Object.defineProperty(w, "devicePixelRatio", { value: 1 });
w.eval(readFileSync("/tmp/smoke-dist/smoke.js", "utf8"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (el) => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
const press = (key) => w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key, bubbles: true }));
let bad = 0;
const assert = (c, m) => { if (!c) { bad += 1; console.error("FAIL:", m); } };

await sleep(200);
const echoLevel = [...w.document.querySelectorAll(".levels button")].find((b) => b.textContent.includes("第一条封条"));
assert(!!echoLevel, "echo level button");
click(echoLevel);
await sleep(150);

// echo-01 geometry: player (5,7), boxes (3,6)/(7,6), plates (3,5)/(7,5), post A (2,6).
const moves = ["a", "a", "ArrowUp", "s", "d", "d", "d", "d", "ArrowUp", "a", "a", "a", "a", "a"];
for (const key of moves) { press(key); await sleep(15); }
await sleep(120);

const panel = () => w.document.querySelector(".panel.echo");
let txt = panel()?.textContent ?? "";
assert(txt.includes("封条 0 / 1") || txt.includes("封条 1 / 1"), "echo panel alive after moves");

// Both plates should now be powered and all three doors open.
const gadget = w.document.querySelector(".panel.gadget")?.textContent ?? "";
assert(gadget.includes("3 扇门打开"), `doors not all open: ${gadget.slice(0, 80)}`);

// The deliver button must now be enabled because we stand on post A.
const deliverBtn = () => [...(panel()?.querySelectorAll("button") ?? [])].find((b) => b.textContent.includes("蒙眼听回声"));
assert(deliverBtn()?.disabled === false, "deliver enabled on the listening post");

// Stick the proven strip (b4), then deliver.
const b4 = [...(panel()?.querySelectorAll("button.board") ?? [])].find((b) => b.textContent.includes("b4"));
assert(!!b4, "b4 strip control");
click(b4);
await sleep(120);
assert((panel()?.textContent ?? "").includes("封条 1 / 1"), "strip applied");

click(deliverBtn());
await sleep(120);
const answerArea = panel()?.querySelectorAll(".answer button") ?? [];
assert(answerArea.length >= 3, "delivery offers each open door");

// The true door is derived from occupancy; click each candidate until one clears.
let cleared = false;
for (const btn of [...answerArea]) {
  const label = btn.textContent.trim();
  if (label === "收起") continue;
  click(btn);
  await sleep(80);
  const notice = w.document.querySelector(".notice")?.textContent ?? "";
  if (notice.includes("门闩松开") || w.document.querySelector(".steps")?.getAttribute("data-status") === "cleared") {
    cleared = true;
    break;
  }
  // Wrong answers leave the challenge up; re-open it for the next try.
  if (!(panel()?.querySelector(".answer"))) {
    const again = deliverBtn();
    if (again && !again.disabled) { click(again); await sleep(80); }
  }
}
assert(cleared, "identifying the true door clears the level");

if (bad) { console.error(`${bad} delivery failure(s)`); process.exit(1); }
console.log("end-to-end delivery test passed");
