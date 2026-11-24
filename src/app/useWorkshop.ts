import { ref } from "vue";
import { useAtlas } from "@/features/atlas";
import { useEcho } from "@/features/echo";
import { useGadget } from "@/features/gadget";
import { useHauler } from "@/features/hauler";
import { useLedger, markCleared } from "@/features/ledger";
import { loadInitial, useVoyage } from "@/features/voyage";
import type { Notice } from "@/shared/commands";
import type { Dir } from "@/shared/types";

export function useWorkshop() {
  const document = ref(loadInitial());
  const notice = ref<Notice>({
    tone: "info",
    message: "把对得上的箱子压上踏板，门和地板会跟着变。",
  });
  const atlas = useAtlas(document);
  const hauler = useHauler(document);
  const gadget = useGadget(document);
  const ledger = useLedger(document);
  const echo = useEcho(document);
  const voyage = useVoyage(document);

  function notify(next: Notice): void {
    notice.value = next;
  }

  function announceLevel(): void {
    const level = document.value.level;
    if (level.mode === "echo") {
      notify({
        tone: "info",
        message: `进入「${level.title}」。把箱子压上踏板竖起封板，工房备了 ${level.stripBudget} 条隔音条；贴好后走到听音位蒙眼交货。`,
      });
      return;
    }
    notify({ tone: "info", message: `进入「${level.title}」。${level.blurb}` });
  }

  function move(dir: Dir): void {
    const result = hauler.tryMove(dir);
    if (!result.moved) {
      if (result.reason === "cleared") {
        notify({ tone: "warn", message: "本关已通关。重置或另选关卡后再推。" });
      }
      return;
    }
    gadget.refresh();
    echo.cancelDelivery();
    const tick = ledger.afterMove(result);
    if (tick.cleared) {
      voyage.commitClear();
      notify({
        tone: "success",
        message: `通关，用了 ${document.value.attempt.steps} 步。最佳记录已写入目录。`,
      });
    }
  }

  function reset(): void {
    voyage.resetLevel();
    gadget.refresh();
    echo.cancelDelivery();
    notify({ tone: "info", message: "已重置当前关卡，最佳记录仍在。" });
  }

  function selectLevel(id: string): void {
    voyage.openLevel(id);
    gadget.refresh();
    echo.cancelDelivery();
    announceLevel();
  }

  function toggleStrip(boardId: string): void {
    const ok = echo.toggleStrip(boardId);
    if (!ok) {
      notify({ tone: "warn", message: "封条已经用满；先揭下一条再贴别处。" });
      return;
    }
    const check = echo.check.value;
    if (!check.ok) {
      const first = check.failures[0];
      const pair = first ? first.pairs[0] : undefined;
      notify({
        tone: "warn",
        message: pair
          ? `还分不清：${pair[0]} 与 ${pair[1]} 的左右差太近（${first?.postId} 位，${first?.freq.toFixed(0)} Hz）。`
          : "还差几处组合分不清。",
      });
      return;
    }
    notify({ tone: "success", message: "现在所有要求的踏板组合、两个听音位、四个音高都能分辨每一对门。" });
  }

  function beginDelivery(): void {
    const result = echo.beginDelivery();
    notify({ tone: result.ok ? "info" : "warn", message: result.message });
  }

  function answerDoor(doorId: string): void {
    const result = echo.answerDoor(doorId);
    if (!result.ok) {
      notify({ tone: "warn", message: result.message });
      return;
    }
    if (result.cleared && markCleared(document.value)) {
      voyage.commitClear();
      notify({
        tone: "success",
        message: `${result.message} 用了 ${document.value.attempt.steps} 步。`,
      });
    } else {
      notify({ tone: "info", message: result.message });
    }
  }

  return {
    document,
    notice,
    atlas,
    hauler,
    gadget,
    ledger,
    echo,
    voyage,
    move,
    reset,
    selectLevel,
    toggleStrip,
    beginDelivery,
    answerDoor,
  };
}
