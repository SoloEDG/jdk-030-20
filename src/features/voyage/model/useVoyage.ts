import { computed, type Ref } from "vue";
import { catalogEntries, getAnyLevel, isEchoId, PUSH_LEVELS } from "../lib/catalog";
import { betterRecord, readSave, writeSave } from "../lib/persist";
import { evaluateGadgets } from "@/features/gadget";
import { freshAttempt } from "@/features/ledger";
import type { GameDocument } from "@/shared/types";

const ENTRIES = catalogEntries();
const FIRST_ID = ENTRIES[0].id;

function knownId(id: string): boolean {
  return ENTRIES.some((entry) => entry.id === id);
}

export function loadInitial(): GameDocument {
  const saved = readSave();
  const currentLevelId = saved && knownId(saved.currentLevelId) ? saved.currentLevelId : FIRST_ID;
  const document: GameDocument = {
    version: 1,
    currentLevelId,
    level: getAnyLevel(currentLevelId),
    attempt: freshAttempt(),
    records: saved?.records ?? {},
  };
  evaluateGadgets(document);
  return document;
}

export function useVoyage(document: Ref<GameDocument>) {
  const catalog = computed(() =>
    ENTRIES.map((entry) => ({
      id: entry.id,
      title: entry.title,
      blurb: entry.blurb,
      bestSteps: document.value.records[entry.id]?.bestSteps ?? null,
      current: entry.id === document.value.currentLevelId,
      echo: isEchoId(entry.id),
    })),
  );
  const completed = computed(() =>
    Object.entries(document.value.records)
      .map(([id, record]) => ({
        id,
        title: ENTRIES.find((entry) => entry.id === id)?.title ?? id,
        bestSteps: record.bestSteps,
        clearedAt: record.clearedAt,
      }))
      .sort((a, b) => a.bestSteps - b.bestSteps),
  );

  function persist(): void {
    writeSave({
      version: 1,
      currentLevelId: document.value.currentLevelId,
      records: document.value.records,
    });
  }

  function openLevel(id: string): void {
    if (!knownId(id)) throw new Error(`未知关卡 ${id}`);
    document.value.currentLevelId = id;
    document.value.level = getAnyLevel(id);
    document.value.attempt = freshAttempt();
    evaluateGadgets(document.value);
    persist();
  }

  function resetLevel(): void {
    openLevel(document.value.currentLevelId);
  }

  function commitClear(): void {
    const id = document.value.currentLevelId;
    const steps = document.value.attempt.steps;
    document.value.records[id] = betterRecord(document.value.records[id], steps, Date.now());
    persist();
  }

  return { catalog, completed, openLevel, resetLevel, commitClear, persist };
}

export { PUSH_LEVELS };
