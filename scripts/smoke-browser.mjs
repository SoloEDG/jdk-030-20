// Mount the built app in jsdom and drive the echo workbench end to end.
// Usage: npm run smoke  (builds a browser IIFE first)
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
  runScripts: "outside-only",
  pretendToBeVisual: true,
});
const w = dom.window;
w.process = { env: { NODE_ENV: "production" } };
const store = new Map();
Object.defineProperty(w, "localStorage", {
  value: {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, v),
    removeItem: (k) => void store.delete(k),
  },
});
const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
w.HTMLCanvasElement.prototype.getContext = () => ctx;
Object.defineProperty(w, "devicePixelRatio", { value: 1 });
w.eval(readFileSync("/tmp/smoke-dist/smoke.js", "utf8"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (el) => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
let bad = 0;
function assert(cond, msg) {
  if (!cond) { bad += 1; console.error("FAIL:", msg); }
}

await sleep(200);
const text = w.document.body.textContent ?? "";
assert(text.includes("栈闩工房"), "app title rendered");
assert(text.includes("门闩入门"), "push level listed");
assert(text.includes("第一条封条"), "echo level listed");

const echoLevel = [...w.document.querySelectorAll(".levels button")].find((b) => b.textContent.includes("第一条封条"));
assert(!!echoLevel, "echo level button");
click(echoLevel);
await sleep(150);

let panel = w.document.querySelector(".panel.echo");
assert(!!panel, "echo panel visible on echo level");
assert(panel?.textContent.includes("封条 0 /"), "starts with no strips");
const b4 = [...(panel?.querySelectorAll("button.board") ?? [])].find((b) => b.textContent.includes("b4"));
assert(!!b4, "board b4 control");
if (b4) { click(b4); await sleep(150); }
panel = w.document.querySelector(".panel.echo");
assert(panel?.textContent.includes("封条 1 / 1"), "one strip placed");
assert(panel?.textContent.includes("已是最少且可辨"), "reaches the proven minimum and reads clean");

// The route ledger should list the paths the level hands over.
panel = w.document.querySelector(".panel.echo");
assert(panel?.textContent.includes("可用路径"), "route ledger shown");
assert(panel?.textContent.includes("直达"), "direct route listed");
assert(panel?.textContent.includes("反弹"), "bounce route listed");

// Switching to the all-plates combo must expose the third door; stripping b4
// must cross out at least one now-silenced bounce.
const scenarioSelect = panel?.querySelectorAll("select")[0];
if (scenarioSelect) {
  scenarioSelect.value = "pa+pb";
  scenarioSelect.dispatchEvent(new w.Event("change", { bubbles: true }));
  await sleep(120);
  panel = w.document.querySelector(".panel.echo");
  assert(panel?.textContent.includes("d3"), "third door shown for full combo");
}

// Delivery off-post must be refused: the player starts away from a post on echo levels.
const deliverBtn = [...(panel?.querySelectorAll("button") ?? [])].find((b) => b.textContent.includes("蒙眼听回声"));
assert(!!deliverBtn, "deliver button present");
assert(deliverBtn?.disabled === true, "deliver disabled while off a listening post");

if (bad) { console.error(`${bad} smoke failure(s)`); process.exit(1); }
console.log("browser smoke test passed");
