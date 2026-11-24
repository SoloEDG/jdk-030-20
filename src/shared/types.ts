export type Dir = "n" | "e" | "s" | "w";
export type TileKind = "wall" | "floor" | "goal" | "gap";
export type BoxKind = "timber" | "iron" | "glass";
export type FloorMorph = "bridge" | "seal";
export type AttemptStatus = "playing" | "cleared";
export type Side = "n" | "e" | "s" | "w";

export interface Vec {
  x: number;
  y: number;
}

export interface Box {
  id: string;
  kind: BoxKind;
  x: number;
  y: number;
}

export interface Plate {
  id: string;
  x: number;
  y: number;
  accept: BoxKind;
  doorIds: string[];
  floorIds: string[];
  boardIds: string[];
  powered: boolean;
}

export interface Door {
  id: string;
  x: number;
  y: number;
  open: boolean;
}

export interface FloorPatch {
  id: string;
  x: number;
  y: number;
  morph: FloorMorph;
  active: boolean;
}

/** A hinged acoustic baffle board. It stands up when any plate that lists it is held. */
export interface Baffle {
  id: string;
  /** Grid cell the board is hinged to. */
  x: number;
  y: number;
  /** Which face of the cell the board stands on: n = top edge, s = bottom edge, w/e = left/right. */
  side: Side;
  /** Fraction of incident amplitude returned by this face (0..1). */
  strength: number;
  /** True when the bounce inverts phase by half a wavelength. */
  flip: boolean;
  /** Whether the board is currently standing (some plate that lists it is held). */
  raised: boolean;
  /** Set when a sound strip is affixed; a strip only quiets a bounce while the board stands. */
  stripped: boolean;
}

/** A listening spot. The walls around it hold the two ears. */
export interface Post {
  id: string;
  x: number;
  y: number;
  name: string;
}

/**
 * One sound path from a door to one ear of a post.
 *
 * The level hands these to you directly: each leg's length, and for a bounce the
 * board's strength and whether the reflection flips phase. `shadow` is the ear's
 * directional weight (near ear 1, far ear quieter); the amplitude is
 * strength * shadow / total length.
 */
export interface EchoRoute {
  id: string;
  doorId: string;
  postId: string;
  ear: "L" | "R";
  kind: "direct" | "bounce";
  /** Boards whose upright blade cuts this direct path, silencing it. */
  blockedBy: string[];
  /** The board this bounce lands on. Only exists while that board is upright. */
  boardId: string | null;
  /** Other boards whose upright blade cuts a bounce leg, silencing it. */
  occluders: string[];
  /** Path lengths per leg, in cells. */
  legs: number[];
  /** Bounce only: 0..1 reflected amplitude. Direct routes use 1. */
  strength: number;
  /** Bounce only: reflection turns the phase over by π. */
  flip: boolean;
  /** Directional weight for this ear at this post. */
  shadow: number;
}

/**
 * One combination the level demands you can read.
 * While `plates` are occupied their boards stand, and any one of `doorIds`
 * may be the door the worker knocks on. Do it at each `postIds` spot.
 */
export interface EchoScenario {
  id: string;
  plates: string[];
  postIds: string[];
  doorIds: string[];
}

export interface RuntimeLevel {
  id: string;
  title: string;
  blurb: string;
  width: number;
  height: number;
  tiles: TileKind[][];
  player: Vec;
  boxes: Box[];
  plates: Plate[];
  doors: Door[];
  floors: FloorPatch[];
  baffles: Baffle[];
  posts: Post[];
  routes: EchoRoute[];
  scenarios: EchoScenario[];
  /** Pitch poles the level must hold at. */
  poles: number[];
  /** Allowed measurement error, dB. Overlapping ranges count as indistinguishable. */
  tolerance: number;
  /** Fixed-length strips on the bench. For echo levels this equals the proven minimum. */
  stripBudget: number;
  /** Which block the level is: ordinary pushing or acoustic echo work. */
  mode: "push" | "echo";
}

export interface Attempt {
  steps: number;
  status: AttemptStatus;
}

export interface LevelRecord {
  bestSteps: number;
  clearedAt: number;
}

export interface GameDocument {
  version: 1;
  currentLevelId: string;
  level: RuntimeLevel;
  attempt: Attempt;
  records: Record<string, LevelRecord>;
}

export interface MoveResult {
  moved: boolean;
  pushed: boolean;
  boxId?: string;
  reason?: "blocked" | "cleared" | "idle";
}

export const BOX_LABEL: Record<BoxKind, string> = {
  timber: "木箱",
  iron: "铁箱",
  glass: "玻璃箱",
};

export const DIR_VEC: Record<Dir, Vec> = {
  n: { x: 0, y: -1 },
  e: { x: 1, y: 0 },
  s: { x: 0, y: 1 },
  w: { x: -1, y: 0 },
};

export const SIDE_LABEL: Record<Side, string> = {
  n: "北面",
  e: "东面",
  s: "南面",
  w: "西面",
};
