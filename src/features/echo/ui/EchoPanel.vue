<script setup lang="ts">
import { computed } from "vue";
import { SIDE_LABEL, type Baffle, type EchoRoute, type GameDocument } from "@/shared/types";
import type { DeliveryChallenge } from "../model/useEcho";
import type { ReadingTable, StripCheck } from "../lib/solver";

interface RouteRow {
  doorId: string;
  routes: { route: EchoRoute; length: number; audible: boolean }[];
}

interface BoardRow {
  baffle: Baffle;
  raised: boolean;
  stripped: boolean;
  plates: string[];
}

const props = defineProps<{
  document: GameDocument;
  isEcho: boolean;
  budget: number;
  used: number;
  check: StripCheck;
  table: ReadingTable | null;
  routes: RouteRow[];
  louder: { doorId: string; ear: "L" | "R"; freq: number; before: number; after: number } | null;
  boards: BoardRow[];
  scenarios: { id: string; label: string }[];
  scenarioId: string;
  postOptions: { id: string; label: string }[];
  postId: string;
  delivery: DeliveryChallenge | null;
  onStage: boolean;
}>();

const emit = defineEmits<{
  toggle: [boardId: string];
  scenario: [id: string];
  post: [id: string];
  deliver: [];
  answer: [doorId: string];
  cancel: [];
}>();

const budgetLabel = computed(() => `${props.used} / ${props.budget}`);
const remaining = computed(() => Math.max(0, props.budget - props.used));
const atMinimum = computed(() => props.check.ok && props.used === props.budget);

function routeLabel(route: EchoRoute): string {
  if (route.kind === "direct") return "直达";
  return `反弹 ${route.boardId ?? ""}${route.flip ? "（翻相）" : ""}`;
}

function fmt(value: number): string {
  const text = value.toFixed(1);
  return value >= 0 ? `+${text}` : text;
}
</script>

<template>
  <section v-if="isEcho" class="panel echo" aria-label="回声校准">
    <h2>回声校准</h2>
    <p class="lede">
      贴条只吞掉打到本板的反弹，板照样立着挡声、挡路。左右耳按相位叠加，别把各条反弹的音量直接相加。
    </p>

    <div class="strip-head">
      <span>封条 {{ budgetLabel }}</span>
      <b :class="{ live: atMinimum }">{{ atMinimum ? "已是最少且可辨" : check.ok ? "可辨但未满" : "仍分不清" }}</b>
    </div>
    <p class="hint">
      工房只备了 {{ budget }} 条定长封条，每条只够贴一块封板；只在板竖起时才对反弹起作用。剩 {{ remaining }} 条。
    </p>

    <ul class="boards">
      <li v-for="row in boards" :key="row.baffle.id">
        <button
          type="button"
          class="board"
          :class="{ raised: row.raised, stripped: row.stripped, flipped: row.baffle.flip }"
          :disabled="!row.stripped && used >= budget"
          :aria-pressed="row.stripped"
          @click="emit('toggle', row.baffle.id)"
        >
          <span class="dot" aria-hidden="true" />
          <span class="meta">
            <b>{{ row.baffle.id }}</b>
            <small>{{ SIDE_LABEL[row.baffle.side] }} · 强 {{ row.baffle.strength.toFixed(2) }} · {{ row.baffle.flip ? "翻相" : "同相" }}</small>
            <small>随 {{ row.plates.join(" / ") || "无" }} 竖起 · {{ row.raised ? "已立" : "卧地" }}</small>
          </span>
          <span class="state">{{ row.stripped ? "已贴" : "空" }}</span>
        </button>
      </li>
    </ul>

    <h3>分组合</h3>
    <div class="pickers">
      <label>
        踏板占用
        <select :value="scenarioId" @change="emit('scenario', ($event.target as HTMLSelectElement).value)">
          <option v-for="s in scenarios" :key="s.id" :value="s.id">{{ s.label }}</option>
        </select>
      </label>
      <label>
        听音位
        <select :value="postId" @change="emit('post', ($event.target as HTMLSelectElement).value)">
          <option v-for="p in postOptions" :key="p.id" :value="p.id">{{ p.label }}</option>
        </select>
      </label>
    </div>

    <table v-if="table" class="echo-table">
      <thead>
        <tr>
          <th>音高</th>
          <th v-for="door in table.cells[0]?.doors ?? []" :key="door.doorId">{{ door.doorId }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in table.cells" :key="row.freq">
          <th>{{ row.freq.toFixed(0) }} Hz</th>
          <td v-for="door in row.doors" :key="door.doorId" :title="`L ${fmt(door.reading.L)} / R ${fmt(door.reading.R)} dB`">
            {{ fmt(door.reading.ild) }}
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="table && table.ambiguous.length" class="warn">
      分不清：{{ table.ambiguous.map((a) => `${a.pair[0]}/${a.pair[1]}@${a.freq.toFixed(0)}Hz`).join("、") }}
    </p>
    <p v-else-if="table" class="ok">该组合在每个音高都能分辨每一对门。</p>
    <p v-if="louder" class="warn">
      注意：{{ louder.doorId }} 在 {{ louder.freq.toFixed(0) }} Hz 的{{ louder.ear === "L" ? "左" : "右" }}耳
      由 {{ fmt(louder.before) }} dB 升到 {{ fmt(louder.after) }} dB——消掉一条路径反而更响，别按音量直接加减。
    </p>

    <h3>可用路径</h3>
    <div v-for="row in routes" :key="row.doorId" class="route-row">
      <b>{{ row.doorId }}</b>
      <ul>
        <li v-for="(entry, index) in row.routes" :key="index" :class="{ off: !entry.audible }">
          <span class="kind">{{ routeLabel(entry.route) }}</span>
          <span class="ear">{{ entry.route.ear }}</span>
          <span class="len">{{ entry.length.toFixed(2) }} 格</span>
          <span class="off-tag">{{ entry.audible ? "" : "已消" }}</span>
        </li>
      </ul>
    </div>

    <h3>蒙眼交货</h3>
    <p class="hint">
      先让箱子压住踏板、走到听音位上再交货；升起的封板仍挡路，脚要停在当时试听的位置。
    </p>
    <div v-if="!delivery" class="deliver-row">
      <button type="button" :disabled="!onStage" @click="emit('deliver')">蒙眼听回声</button>
      <span v-if="!onStage" class="hint">（站在耳形听音位上才能交货）</span>
    </div>
    <div v-else class="answer">
      <p>
        听到左右差 <b>{{ fmt(delivery.heardIld) }} dB</b>（{{ delivery.freq.toFixed(0) }} Hz，{{ delivery.postId }} 位）。
        报出是哪扇门：
      </p>
      <div class="doors">
        <button v-for="door in delivery.candidates" :key="door" type="button" @click="emit('answer', door)">
          {{ door }}
        </button>
        <button type="button" class="ghost" @click="emit('cancel')">收起</button>
      </div>
    </div>
  </section>
</template>
