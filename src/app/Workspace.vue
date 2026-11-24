<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { StageView, TileLegend } from "@/features/atlas";
import { EchoPanel } from "@/features/echo";
import { GadgetPanel } from "@/features/gadget";
import { MoverHud } from "@/features/hauler";
import { StepMeter } from "@/features/ledger";
import { LevelRail, RecordBoard } from "@/features/voyage";
import { dirFromKey, shouldCapture } from "./keys";
import { useWorkshop } from "./useWorkshop";

const shop = useWorkshop();
const { document, notice } = shop;
const { title, blurb } = shop.atlas;
const { counts } = shop.hauler;
const { summary } = shop.gadget;
const { steps, status, coverage } = shop.ledger;
const { catalog, completed } = shop.voyage;
const echo = shop.echo;

const scenarioOptions = computed(() =>
  document.value.level.scenarios.map((scenario) => ({
    id: scenario.id,
    label: scenario.plates.join(" + ") || "无",
  })),
);

const postOptions = computed(() => {
  const scenario = echo.activeScenario.value;
  if (!scenario) return [];
  return document.value.level.posts
    .filter((post) => scenario.postIds.includes(post.id))
    .map((post) => ({ id: post.id, label: `${post.name}（${post.x},${post.y}）` }));
});

const onStage = computed(() => {
  const { x, y } = document.value.level.player;
  return document.value.level.posts.some((post) => post.x === x && post.y === y);
});

function onKey(event: KeyboardEvent): void {
  if (!shouldCapture(event)) return;
  const action = dirFromKey(event);
  if (!action) return;
  event.preventDefault();
  if (action === "reset") shop.reset();
  else shop.move(action);
}

onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <div class="workshop">
    <header class="mast">
      <div class="brand">
        <span class="mark" aria-hidden="true">闩</span>
        <div>
          <h1>栈闩工房</h1>
          <p>箱认踏板，板动门廊。一步一格，记下你走的路。</p>
        </div>
      </div>
      <p class="notice" :data-tone="notice.tone">{{ notice.message }}</p>
    </header>
    <div class="bench">
      <aside class="rail">
        <LevelRail :catalog="catalog" @select="shop.selectLevel" @reset="shop.reset" />
        <RecordBoard :completed="completed" />
      </aside>
      <main class="stage">
        <div class="stage-head">
          <h2>{{ title }}</h2>
          <p>{{ blurb }}</p>
        </div>
        <StageView :document="document" />
        <MoverHud :counts="counts" />
      </main>
      <aside class="side">
        <StepMeter :steps="steps" :status="status" :coverage="coverage" />
        <EchoPanel
          v-if="echo.isEcho.value"
          :document="document"
          :is-echo="true"
          :budget="echo.budget.value"
          :used="echo.usedStrips.value"
          :check="echo.check.value"
          :table="echo.table.value"
          :routes="echo.routeInfo.value"
          :louder="echo.louder.value"
          :boards="echo.boardInfo.value"
          :scenarios="scenarioOptions"
          :scenario-id="echo.activeScenario.value?.id ?? ''"
          :post-options="postOptions"
          :post-id="echo.activePost.value"
          :delivery="echo.delivery.value"
          :on-stage="onStage"
          @toggle="shop.toggleStrip"
          @scenario="echo.selectScenario"
          @post="echo.selectPost"
          @deliver="shop.beginDelivery"
          @answer="shop.answerDoor"
          @cancel="echo.cancelDelivery"
        />
        <GadgetPanel :document="document" :summary="summary" />
        <TileLegend :echo="document.level.mode === 'echo'" />
      </aside>
    </div>
  </div>
</template>
