import type { Baffle, Vec } from "@/shared/types";
import { segmentOf } from "./acoustics";

/** The shared edge between two side-by-side cells, or null if they are not neighbours. */
export function sharedEdge(a: Vec, b: Vec): { p: Vec; q: Vec } | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return null;
  if (dy === 0) {
    const x = Math.max(a.x, b.x);
    return { p: { x, y: a.y }, q: { x, y: a.y + 1 } };
  }
  const y = Math.max(a.y, b.y);
  return { p: { x: a.x, y }, q: { x: a.x + 1, y } };
}

function samePoint(a: Vec, b: Vec): boolean {
  return Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9;
}

/**
 * A standing board lies on a cell edge and bars you from stepping across it.
 * Strips are acoustic only — a stripped board still stands and still blocks.
 */
export function boardBlocksStep(baffles: Baffle[], from: Vec, to: Vec): boolean {
  const edge = sharedEdge(from, to);
  if (!edge) return false;
  for (const baffle of baffles) {
    if (!baffle.raised) continue;
    const seg = segmentOf(baffle);
    const forward = samePoint(seg.a, edge.p) && samePoint(seg.b, edge.q);
    const backward = samePoint(seg.a, edge.q) && samePoint(seg.b, edge.p);
    if (forward || backward) return true;
  }
  return false;
}
