import { boxAt } from "./occupancy";
import { isPassable } from "@/features/gadget";
import { boardBlocksStep } from "@/features/echo/lib/blocking";
import { addVec } from "@/shared/document";
import { DIR_VEC, type Dir, type GameDocument, type MoveResult } from "@/shared/types";

export function applyMove(document: GameDocument, dir: Dir): MoveResult {
  if (document.attempt.status === "cleared") return { moved: false, pushed: false, reason: "cleared" };
  const delta = DIR_VEC[dir];
  const origin = document.level.player;
  const next = addVec(origin, delta);
  // A raised baffle board on the shared edge stands in the way like a thin wall.
  if (boardBlocksStep(document.level.baffles, origin, next)) {
    return { moved: false, pushed: false, reason: "blocked" };
  }
  const box = boxAt(document, next);
  if (box) {
    const beyond = addVec(box, delta);
    if (boardBlocksStep(document.level.baffles, box, beyond)) {
      return { moved: false, pushed: false, reason: "blocked" };
    }
    if (!isPassable(document, beyond, { ignoreBoxId: box.id, ignorePlayer: true })) {
      return { moved: false, pushed: false, reason: "blocked" };
    }
    box.x = beyond.x;
    box.y = beyond.y;
    document.level.player = next;
    return { moved: true, pushed: true, boxId: box.id };
  }
  if (!isPassable(document, next)) return { moved: false, pushed: false, reason: "blocked" };
  document.level.player = next;
  return { moved: true, pushed: false };
}
