import { computed, ref, type Ref } from "vue";
import { readDoor, type EarReading } from "../lib/acoustics";
import {
  checkStrips,
  louderAfterStrip,
  occupiedPlates,
  openDoors,
  raisedBoards,
  readingTable,
  strippedBoardIds,
} from "../lib/solver";
import { isAudible, routeLength } from "../lib/acoustics";
import type { EchoRoute, EchoScenario, GameDocument } from "@/shared/types";

export interface DeliveryChallenge {
  postId: string;
  scenarioId: string;
  freq: number;
  trueDoorId: string;
  candidates: string[];
  /** The reading the listener hears (true door's ILD, with a little jitter). */
  heardIld: number;
  table: Map<string, EarReading>;
}

/** Stable pseudo-random offset in [-1, 1], so deliveries are repeatable but not exact. */
function deterministicJitter(...parts: (string | number)[]): number {
  let hash = 2166136261;
  for (const part of parts.join("|")) {
    hash ^= part.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) / 0xffffffff) * 2 - 1;
}

export function useEcho(document: Ref<GameDocument>) {
  const scenarioId = ref<string>("");
  const postId = ref<string>("");
  const delivery = ref<DeliveryChallenge | null>(null);

  const level = computed(() => document.value.level);
  const isEcho = computed(() => level.value.mode === "echo");

  const activeScenario = computed<EchoScenario | null>(() => {
    const list = level.value.scenarios;
    if (!list.length) return null;
    return list.find((s) => s.id === scenarioId.value) ?? list[0];
  });

  const activePost = computed(() => {
    const scenario = activeScenario.value;
    if (!scenario) return "";
    if (postId.value && scenario.postIds.includes(postId.value)) return postId.value;
    return scenario.postIds[0] ?? "";
  });

  const currentStrips = computed(() => strippedBoardIds(level.value));
  const budget = computed(() => level.value.stripBudget);
  const usedStrips = computed(() => currentStrips.value.size);

  const check = computed(() => checkStrips(level.value, currentStrips.value));

  const table = computed(() => {
    const scenario = activeScenario.value;
    if (!scenario) return null;
    return readingTable(level.value, scenario, activePost.value, currentStrips.value);
  });

  /** Route ledger for the active scenario/post: what the level hands you to reason with. */
  const routeInfo = computed(() => {
    const scenario = activeScenario.value;
    if (!scenario) return [];
    const raised = raisedBoards(level.value.plates, scenario.plates);
    const strips = currentStrips.value;
    return scenario.doorIds.map((doorId) => ({
      doorId,
      routes: level.value.routes
        .filter((r) => r.doorId === doorId && r.postId === activePost.value)
        .map((route: EchoRoute) => ({
          route,
          length: routeLength(route),
          audible: isAudible(route, raised, strips),
        })),
    }));
  });

  /** Does any strip currently make a single ear louder? A live counter-example. */
  const louder = computed(() => {
    const scenario = activeScenario.value;
    if (!scenario) return null;
    return louderAfterStrip(level.value, scenario, activePost.value, currentStrips.value);
  });

  const boardInfo = computed(() =>
    level.value.baffles.map((baffle) => ({
      baffle,
      raised: baffle.raised,
      stripped: baffle.stripped,
      plates: level.value.plates.filter((p) => p.boardIds.includes(baffle.id)).map((p) => p.id),
    })),
  );

  /** Live occupancy: which doors are currently open and which boards stand. */
  const live = computed(() => {
    const occupied = occupiedPlates(level.value);
    return {
      occupied,
      doors: openDoors(level.value.plates, occupied),
      raised: raisedBoards(level.value.plates, occupied),
    };
  });

  function toggleStrip(boardId: string): boolean {
    const baffle = level.value.baffles.find((b) => b.id === boardId);
    if (!baffle) return false;
    if (!baffle.stripped && currentStrips.value.size >= budget.value) return false;
    baffle.stripped = !baffle.stripped;
    delivery.value = null;
    return true;
  }

  function selectScenario(id: string): void {
    scenarioId.value = id;
    postId.value = "";
  }

  function selectPost(id: string): void {
    postId.value = id;
  }

  function playerPost(): string | null {
    const { x, y } = document.value.level.player;
    const post = level.value.posts.find((p) => p.x === x && p.y === y);
    return post ? post.id : null;
  }

  /** Start a blind delivery from the post the player is standing on. */
  function beginDelivery(): { ok: boolean; message: string } {
    const post = playerPost();
    if (!post) return { ok: false, message: "先走到一个听音位（地上的耳形标记），再蒙眼交货。" };
    const doors = live.value.doors;
    if (doors.length < 2) {
      return { ok: false, message: "至少让两扇门同时开着，才有「哪一扇」可辨认。" };
    }
    const strips = currentStrips.value;
    // The physical occupancy must be exactly one of the guaranteed-readable combos.
    const occupied = live.value.occupied;
    const sameSet = (a: string[], b: string[]) =>
      a.length === b.length && a.every((id) => b.includes(id));
    const scenario = level.value.scenarios.find(
      (s) => s.postIds.includes(post) && sameSet(s.plates, occupied) && sameSet(s.doorIds, doors),
    );
    if (!scenario) {
      return { ok: false, message: "眼下的踏板组合不在关卡要求的可辨组合里，换一种占位再试。" };
    }
    const comboCheck = checkStrips(level.value, strips);
    if (!comboCheck.ok) {
      return { ok: false, message: `当前贴条还差 ${comboCheck.failures.length} 处组合分不清，先补齐再来。` };
    }
    // The boards actually standing are the live ones; they equal the scenario's by
    // construction, but read the physical state so the echo follows the world.
    const raised = live.value.raised;
    // Pick the pole where the level is calibrated; any pole is unique by design.
    const freq = level.value.poles[0];
    const readings = new Map<string, EarReading>();
    for (const doorId of doors) {
      readings.set(doorId, readDoor(level.value.routes, doorId, post, freq, raised, strips));
    }
    const sorted = [...doors].sort();
    const index = scenario.plates.length % sorted.length;
    const trueDoorId = sorted[index];
    const heard = readings.get(trueDoorId)!;
    // A real listener never reads the model value exactly; add an error inside the
    // tolerance band. Every door pair is farther apart than 2·tolerance, so the
    // reported number still names exactly one door.
    const jitter = deterministicJitter(level.value.id, scenario.id, post, freq) * level.value.tolerance;
    delivery.value = {
      postId: post,
      scenarioId: scenario.id,
      freq,
      trueDoorId,
      candidates: sorted,
      heardIld: heard.ild + jitter,
      table: readings,
    };
    return {
      ok: true,
      message: `蒙眼后听见左右差 ${(heard.ild + jitter).toFixed(1)} dB（音高 ${freq.toFixed(0)} Hz）。报出是哪一扇门。`,
    };
  }

  /** Answer the blind delivery. */
  function answerDoor(doorId: string): { ok: boolean; cleared: boolean; message: string } {
    const challenge = delivery.value;
    if (!challenge) return { ok: false, cleared: false, message: "还没有开始交货。" };
    if (doorId === challenge.trueDoorId) {
      return { ok: true, cleared: true, message: "报对了，门闩松开。回声校准通过。" };
    }
    return { ok: false, cleared: false, message: "不对，那一扇不是敲响的门。再听一次。" };
  }

  function cancelDelivery(): void {
    delivery.value = null;
  }

  return {
    isEcho,
    activeScenario,
    activePost,
    scenarioId,
    postId,
    budget,
    usedStrips,
    currentStrips,
    check,
    table,
    routeInfo,
    louder,
    boardInfo,
    live,
    delivery,
    toggleStrip,
    selectScenario,
    selectPost,
    beginDelivery,
    answerDoor,
    cancelDelivery,
  };
}
