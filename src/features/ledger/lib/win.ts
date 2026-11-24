import { goalCells } from "@/features/atlas";
import { sameCell } from "@/shared/document";
import type { GameDocument, Vec } from "@/shared/types";

export function filledGoals(document: GameDocument): Vec[] {
  return goalCells(document.level).filter((cell) =>
    document.level.boxes.some((box) => sameCell(box, cell)),
  );
}

export function goalsSatisfied(document: GameDocument): boolean {
  const goals = goalCells(document.level);
  if (goals.length === 0) return false;
  return goals.every((cell) => document.level.boxes.some((box) => sameCell(box, cell)));
}

export function coverageLine(document: GameDocument): string {
  if (document.level.mode === "echo") {
    const raised = document.level.baffles.filter((b) => b.raised).length;
    const strips = document.level.baffles.filter((b) => b.stripped).length;
    return `封板 ${raised} 块立起 · 封条 ${strips} 条 · 走到听音位蒙眼交货`;
  }
  const total = goalCells(document.level).length;
  const filled = filledGoals(document).length;
  return `${filled} / ${total} 个目标格已有箱子`;
}
