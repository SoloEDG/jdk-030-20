import { sameCell } from "@/shared/document";
import type { GameDocument } from "@/shared/types";

export function plateHeld(document: GameDocument, plateId: string): boolean {
  const plate = document.level.plates.find((item) => item.id === plateId);
  if (!plate) return false;
  return document.level.boxes.some(
    (box) => sameCell(box, plate) && box.kind === plate.accept,
  );
}

/**
 * Recompute every plate-driven element from the boxes' positions.
 * Plates open doors, morph floors, and raise the hinged baffle boards.
 */
export function evaluateGadgets(document: GameDocument): void {
  const doorPower = new Set<string>();
  const floorPower = new Set<string>();
  const boardPower = new Set<string>();
  for (const plate of document.level.plates) {
    const held = document.level.boxes.some(
      (box) => sameCell(box, plate) && box.kind === plate.accept,
    );
    plate.powered = held;
    if (!held) continue;
    for (const id of plate.doorIds) doorPower.add(id);
    for (const id of plate.floorIds) floorPower.add(id);
    for (const id of plate.boardIds) boardPower.add(id);
  }
  for (const door of document.level.doors) door.open = doorPower.has(door.id);
  for (const floor of document.level.floors) floor.active = floorPower.has(floor.id);
  for (const baffle of document.level.baffles) baffle.raised = boardPower.has(baffle.id);
}

export function poweredSummary(document: GameDocument): string {
  const plates = document.level.plates.filter((plate) => plate.powered).length;
  const doors = document.level.doors.filter((door) => door.open).length;
  const floors = document.level.floors.filter((floor) => floor.active).length;
  if (document.level.mode === "echo") {
    const raised = document.level.baffles.filter((b) => b.raised).length;
    const strips = document.level.baffles.filter((b) => b.stripped).length;
    return `${plates} 块踏板供电 · ${doors} 扇门打开 · ${raised} 块封板竖起 · ${strips} 条已贴`;
  }
  return `${plates} 块踏板供电 · ${doors} 扇门打开 · ${floors} 处地板变形`;
}
