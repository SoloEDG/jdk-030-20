import { createApp, nextTick } from "vue";
import Workspace from "../src/app/Workspace.vue";

const host = document.createElement("div");
host.id = "app";
document.body.appendChild(host);
createApp(Workspace).mount(host);
nextTick(() => {
  (window as any).__smokeText = document.body.textContent ?? "";
});
