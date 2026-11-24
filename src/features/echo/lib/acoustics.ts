import type { Baffle, Door, EchoRoute, Post, Vec } from "@/shared/types";

/**
 * 声学模型
 *
 * 门缝透出的声音以若干条「直达 / 一次反弹」路径抵达听音位的左右耳。
 * 同一扇门、同一只耳朵的所有可用路径按复振幅相加（含相位），再换算成声压级。
 *
 * - 路径长度：各段距离之和（单位：格）。
 * - 相位：2π·f·d / c；反弹再按 `flip` 加 π。
 * - 振幅：strength × 朝向权重 / 路径长度。
 * - 反弹仅在所贴的板竖起、且板上没贴消音条时才存在。
 * - 直达路径被任何竖起的板切断就消失（贴了条的板照样挡声）。
 *
 * 各条路径之间存在相位差，会互相增强或抵消；因此不能把各条反弹的音量直接相加，
 * 消掉一条响亮的路径反而可能让一耳的总响度变大。
 */

export const SOUND_SPEED = 343;
export const AMP_FLOOR = 1e-9;

export interface Complex {
  re: number;
  im: number;
}

export function doorCenter(door: Door): Vec {
  return { x: door.x + 0.5, y: door.y + 0.5 };
}

export function postCenter(post: Post): Vec {
  return { x: post.x + 0.5, y: post.y + 0.5 };
}

/** Whether a bounce path is present right now. Strips only quiet their own board face. */
export function isAudible(
  route: EchoRoute,
  raised: ReadonlySet<string>,
  stripped: ReadonlySet<string>,
): boolean {
  if (route.kind === "direct") {
    return !route.blockedBy.some((id) => raised.has(id));
  }
  if (!route.boardId || !raised.has(route.boardId)) return false;
  if (stripped.has(route.boardId)) return false;
  return !route.occluders.some((id) => raised.has(id));
}

export function routeLength(route: EchoRoute): number {
  return route.legs.reduce((sum, leg) => sum + leg, 0);
}

/** Complex amplitude of one route at one pitch. */
export function routePhasor(route: EchoRoute, freq: number): Complex {
  const total = routeLength(route);
  const amplitude = (route.strength * route.shadow) / Math.max(total, 0.5);
  const phase = (2 * Math.PI * freq * total) / SOUND_SPEED + (route.flip ? Math.PI : 0);
  return { re: amplitude * Math.cos(phase), im: amplitude * Math.sin(phase) };
}

export function combine(phasors: Complex[]): number {
  let re = 0;
  let im = 0;
  for (const p of phasors) {
    re += p.re;
    im += p.im;
  }
  return Math.hypot(re, im);
}

export function toDb(amplitude: number): number {
  return 20 * Math.log10(Math.max(amplitude, AMP_FLOOR));
}

export interface EarReading {
  L: number;
  R: number;
  /** Left-right level difference in dB. */
  ild: number;
  /** Number of audible paths that reached each ear. */
  paths: { L: number; R: number };
}

export function readDoor(
  routes: EchoRoute[],
  doorId: string,
  postId: string,
  freq: number,
  raised: ReadonlySet<string>,
  stripped: ReadonlySet<string>,
): EarReading {
  const ears: Record<"L" | "R", Complex[]> = { L: [], R: [] };
  for (const route of routes) {
    if (route.doorId !== doorId || route.postId !== postId) continue;
    if (!isAudible(route, raised, stripped)) continue;
    ears[route.ear].push(routePhasor(route, freq));
  }
  const L = toDb(combine(ears.L));
  const R = toDb(combine(ears.R));
  return { L, R, ild: L - R, paths: { L: ears.L.length, R: ears.R.length } };
}

/** Two doors are confusable when their ILD ranges overlap within the tolerance. */
export function doorsDistinct(readings: Map<string, EarReading>, tolerance: number): boolean {
  const values = [...readings.values()];
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      if (Math.abs(values[i].ild - values[j].ild) <= 2 * tolerance + 1e-9) return false;
    }
  }
  return true;
}

export function ambiguousPairs(
  readings: Map<string, EarReading>,
  tolerance: number,
): [string, string][] {
  const entries = [...readings.entries()];
  const pairs: [string, string][] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      if (Math.abs(entries[i][1].ild - entries[j][1].ild) <= 2 * tolerance + 1e-9) {
        pairs.push([entries[i][0], entries[j][0]]);
      }
    }
  }
  return pairs;
}

function cross(u: Vec, v: Vec): number {
  return u.x * v.y - u.y * v.x;
}

export function segmentOf(baffle: Baffle): { a: Vec; b: Vec } {
  const { x, y, side } = baffle;
  switch (side) {
    case "n":
      return { a: { x, y }, b: { x: x + 1, y } };
    case "s":
      return { a: { x, y: y + 1 }, b: { x: x + 1, y: y + 1 } };
    case "w":
      return { a: { x, y }, b: { x, y: y + 1 } };
    case "e":
      return { a: { x: x + 1, y }, b: { x: x + 1, y: y + 1 } };
  }
}

/** Whether the straight line cut1→cut2 passes through the board face. */
export function lineCutBy(from: Vec, to: Vec, baffle: Baffle): boolean {
  const { a, b } = segmentOf(baffle);
  const r = { x: to.x - from.x, y: to.y - from.y };
  const s = { x: b.x - a.x, y: b.y - a.y };
  const den = cross(r, s);
  if (Math.abs(den) < 1e-9) return false;
  const qp = { x: a.x - from.x, y: a.y - from.y };
  const t = cross(qp, s) / den;
  const u = cross(qp, r) / den;
  return t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9;
}

/** Mirror-optics bounce point of from → ear off the board face, or null. */
export function bouncePoint(from: Vec, ear: Vec, baffle: Baffle): Vec | null {
  const { a, b } = segmentOf(baffle);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return null;
  const t = ((ear.x - a.x) * dx + (ear.y - a.y) * dy) / l2;
  const px = a.x + t * dx;
  const py = a.y + t * dy;
  const image = { x: 2 * px - ear.x, y: 2 * py - ear.y };
  const rv = { x: image.x - from.x, y: image.y - from.y };
  const s = { x: b.x - a.x, y: b.y - a.y };
  const den = cross(rv, s);
  if (Math.abs(den) < 1e-9) return null;
  const qp = { x: a.x - from.x, y: a.y - from.y };
  const tt = cross(qp, s) / den;
  const uu = cross(qp, rv) / den;
  if (tt > 1e-7 && tt < 1 - 1e-7 && uu >= -1e-7 && uu <= 1 + 1e-7) {
    return { x: from.x + tt * rv.x, y: from.y + tt * rv.y };
  }
  return null;
}

/** Head-shadow weight of a source at one ear; near ear 1, far ear quieter with bearing. */
export function shadowWeight(source: Vec, ear: "L" | "R", listener: Vec): number {
  const dx = source.x - listener.x;
  const dist = Math.hypot(source.x - listener.x, source.y - listener.y);
  if (dist < 1e-9) return 1;
  const lateral = Math.abs(dx) / dist;
  const near = (dx >= 0 && ear === "R") || (dx < 0 && ear === "L");
  if (near || lateral < 1e-9) return 1;
  return Math.pow(10, (-12 * lateral) / 20);
}
