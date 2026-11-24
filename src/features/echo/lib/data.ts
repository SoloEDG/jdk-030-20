import type { EchoRoute, EchoScenario, TileKind } from "@/shared/types";

/**
 * 回声关卡的静态数据。
 *
 * 每条 route 都由关卡几何预先把段长、反弹强弱、相位翻转、两耳朝向权重算好。
 * 运行时的 acoustics 只负责判断哪些路径当前可听、按相位叠加、比较左右耳响度差。
 *
 * 三关的封条预算与解法都在 4 个音高、2 个听音位、全部踏板组合上回归验证过：
 * 少一条会有一对门分不清，多一条则违反「最少」。
 */

export interface EchoBox {
  kind: "timber" | "iron" | "glass";
  x: number;
  y: number;
}

export interface EchoPlateData {
  id: string;
  x: number;
  y: number;
  accept: "timber" | "iron" | "glass";
  doorIds: string[];
  boardIds: string[];
}

export interface EchoBaffleData {
  id: string;
  x: number;
  y: number;
  side: "n" | "e" | "s" | "w";
  strength: number;
  flip: boolean;
}

export interface EchoLevelData {
  id: string;
  title: string;
  blurb: string;
  width: number;
  height: number;
  rows: string[];
  player: { x: number; y: number };
  boxes: EchoBox[];
  plates: EchoPlateData[];
  doors: { id: string; x: number; y: number }[];
  posts: { id: string; x: number; y: number; name: string }[];
  baffles: EchoBaffleData[];
  routes: EchoRoute[];
  scenarios: EchoScenario[];
  poles: number[];
  tolerance: number;
  /** How many strips the level hands you == the proven minimum. */
  stripBudget: number;
  /** One proven minimum placement, for tests and the answer key. */
  solution: string[];
  /** A spot where stripping a path makes a single ear louder. */
  gainExample: { plates: string[]; post: string; door: string; ear: string; freq: number; before: number; after: number };
}

const LEVEL_ONE_ROWS = [
  "###########",
  "#.........#",
  "#.........#",
  "#.........#",
  "#.........#",
  "#.........#",
  "#.........#",
  "#.........#",
  "###########",
] as const;

const LEVEL_ONE_ROUTES: EchoRoute[] = [
  {
    id: "d1.A.L.direct", doorId: "d1", postId: "A",
    ear: "L", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [6.06862],
    strength: 1, flip: false, shadow: 1,
  },
  {
    id: "d1.A.R.direct", doorId: "d1", postId: "A",
    ear: "R", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [6.0982],
    strength: 1, flip: false, shadow: 0.79682,
  },
  {
    id: "d1.B.L.direct", doorId: "d1", postId: "B",
    ear: "L", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [9.1514],
    strength: 1, flip: false, shadow: 1,
  },
  {
    id: "d1.B.R.direct", doorId: "d1", postId: "B",
    ear: "R", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [9.28806],
    strength: 1, flip: false, shadow: 0.3503,
  },
  {
    id: "d2.A.L.direct", doorId: "d2", postId: "A",
    ear: "L", kind: "direct",
    blockedBy: ["b2"], boardId: null,
    occluders: [],
    legs: [6.74893],
    strength: 1, flip: false, shadow: 0.5391,
  },
  {
    id: "d2.A.L.b3", doorId: "d2", postId: "A",
    ear: "L", kind: "bounce",
    blockedBy: [], boardId: "b3",
    occluders: [],
    legs: [4.07206, 7.66711],
    strength: 0.65, flip: true, shadow: 0.30631,
  },
  {
    id: "d2.A.L.b4", doorId: "d2", postId: "A",
    ear: "L", kind: "bounce",
    blockedBy: [], boardId: "b4",
    occluders: [],
    legs: [3.11253, 6.95962],
    strength: 0.93, flip: true, shadow: 0.3318,
  },
  {
    id: "d2.A.R.direct", doorId: "d2", postId: "A",
    ear: "R", kind: "direct",
    blockedBy: ["b2"], boardId: null,
    occluders: [],
    legs: [6.66844],
    strength: 1, flip: false, shadow: 1,
  },
  {
    id: "d2.A.R.b3", doorId: "d2", postId: "A",
    ear: "R", kind: "bounce",
    blockedBy: [], boardId: "b3",
    occluders: ["b4"],
    legs: [4.09151, 7.49331],
    strength: 0.65, flip: true, shadow: 1,
  },
  {
    id: "d2.A.R.b4", doorId: "d2", postId: "A",
    ear: "R", kind: "bounce",
    blockedBy: [], boardId: "b4",
    occluders: [],
    legs: [3.13785, 6.7903],
    strength: 0.93, flip: true, shadow: 1,
  },
  {
    id: "d2.B.L.direct", doorId: "d2", postId: "B",
    ear: "L", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [6.66844],
    strength: 1, flip: false, shadow: 1,
  },
  {
    id: "d2.B.R.direct", doorId: "d2", postId: "B",
    ear: "R", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [6.74893],
    strength: 1, flip: false, shadow: 0.5391,
  },
  {
    id: "d3.A.L.direct", doorId: "d3", postId: "A",
    ear: "L", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [9.28806],
    strength: 1, flip: false, shadow: 0.3503,
  },
  {
    id: "d3.A.R.direct", doorId: "d3", postId: "A",
    ear: "R", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [9.1514],
    strength: 1, flip: false, shadow: 1,
  },
  {
    id: "d3.B.L.direct", doorId: "d3", postId: "B",
    ear: "L", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [6.0982],
    strength: 1, flip: false, shadow: 0.79682,
  },
  {
    id: "d3.B.L.b1", doorId: "d3", postId: "B",
    ear: "L", kind: "bounce",
    blockedBy: [], boardId: "b1",
    occluders: ["b2"],
    legs: [7.27824, 6.05773],
    strength: 0.89, flip: false, shadow: 1,
  },
  {
    id: "d3.B.L.b2", doorId: "d3", postId: "B",
    ear: "L", kind: "bounce",
    blockedBy: [], boardId: "b2",
    occluders: [],
    legs: [6.42952, 5.1553],
    strength: 0.67, flip: true, shadow: 1,
  },
  {
    id: "d3.B.R.direct", doorId: "d3", postId: "B",
    ear: "R", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [6.06862],
    strength: 1, flip: false, shadow: 1,
  },
  {
    id: "d3.B.R.b1", doorId: "d3", postId: "B",
    ear: "R", kind: "bounce",
    blockedBy: [], boardId: "b1",
    occluders: ["b2"],
    legs: [7.25643, 6.24053],
    strength: 0.89, flip: false, shadow: 0.29127,
  },
  {
    id: "d3.B.R.b2", doorId: "d3", postId: "B",
    ear: "R", kind: "bounce",
    blockedBy: [], boardId: "b2",
    occluders: [],
    legs: [6.39895, 5.34022],
    strength: 0.67, flip: true, shadow: 0.3069,
  },
];

const LEVEL_ONE_SCENARIOS: EchoScenario[] = [
  {
    id: "pa",
    plates: ["pa"], postIds: ["A", "B"], doorIds: ["d1", "d2"],
  },
  {
    id: "pb",
    plates: ["pb"], postIds: ["A", "B"], doorIds: ["d2", "d3"],
  },
  {
    id: "pa+pb",
    plates: ["pa", "pb"], postIds: ["A", "B"], doorIds: ["d1", "d2", "d3"],
  },
];

export const LEVEL_ONE: EchoLevelData = {
  id: "echo-01", title: "第一条封条",
  blurb: "两条廊道各由一块踏板供电，门与封板一起动。先听听哪块板竖着时最吵，再决定那条唯一的封条贴哪儿。",
  width: 11, height: 9, rows: [...LEVEL_ONE_ROWS],
  player: { x: 5, y: 7 },
  boxes: [
    { kind: "timber", x: 3, y: 6 },
    { kind: "timber", x: 7, y: 6 },
  ],
  plates: [
    { id: "pa", x: 3, y: 5, accept: "timber", doorIds: ["d1", "d2"], boardIds: ["b3", "b4"] },
    { id: "pb", x: 7, y: 5, accept: "timber", doorIds: ["d2", "d3"], boardIds: ["b2", "b1"] },
  ],
  doors: [
    { id: "d1", x: 1, y: 0 },
    { id: "d2", x: 5, y: 0 },
    { id: "d3", x: 9, y: 0 },
  ],
  posts: [
    { id: "A", x: 2, y: 6, name: "甲位" },
    { id: "B", x: 8, y: 6, name: "乙位" },
  ],
  baffles: [
    { id: "b1", x: 2, y: 3, side: "e", strength: 0.89, flip: false },
    { id: "b2", x: 3, y: 3, side: "e", strength: 0.67, flip: true },
    { id: "b3", x: 8, y: 2, side: "e", strength: 0.65, flip: true },
    { id: "b4", x: 7, y: 2, side: "e", strength: 0.93, flip: true },
  ],
  routes: LEVEL_ONE_ROUTES,
  scenarios: LEVEL_ONE_SCENARIOS,
  poles: [196.0, 262.0, 330.0, 415.0], tolerance: 1,
  stripBudget: 1, solution: ["b4"],
  gainExample: {"plates": ["pa"], "post": "A", "door": "d2", "ear": "L", "freq": 196.0, "before": -25.16, "after": -22.96},
};

const LEVEL_TWO_ROWS = [
  "###########",
  "#.........#",
  "#.........#",
  "#.........#",
  "#.........#",
  "#.........#",
  "#.........#",
  "#.........#",
  "###########",
] as const;

const LEVEL_TWO_ROUTES: EchoRoute[] = [
  {
    id: "d1.A.L.direct", doorId: "d1", postId: "A",
    ear: "L", kind: "direct",
    blockedBy: ["b2"], boardId: null,
    occluders: [],
    legs: [6.06862],
    strength: 1, flip: false, shadow: 1,
  },
  {
    id: "d1.A.L.b3", doorId: "d1", postId: "A",
    ear: "L", kind: "bounce",
    blockedBy: [], boardId: "b3",
    occluders: [],
    legs: [4.43852, 2.8229],
    strength: 0.94, flip: true, shadow: 0.47366,
  },
  {
    id: "d1.A.L.b4", doorId: "d1", postId: "A",
    ear: "L", kind: "bounce",
    blockedBy: [], boardId: "b4",
    occluders: [],
    legs: [7.25643, 6.24053],
    strength: 0.86, flip: false, shadow: 0.29127,
  },
  {
    id: "d1.A.R.direct", doorId: "d1", postId: "A",
    ear: "R", kind: "direct",
    blockedBy: ["b2"], boardId: null,
    occluders: [],
    legs: [6.0982],
    strength: 1, flip: false, shadow: 0.79682,
  },
  {
    id: "d1.A.R.b3", doorId: "d1", postId: "A",
    ear: "R", kind: "bounce",
    blockedBy: [], boardId: "b3",
    occluders: [],
    legs: [4.57901, 2.58256],
    strength: 0.94, flip: true, shadow: 1,
  },
  {
    id: "d1.A.R.b4", doorId: "d1", postId: "A",
    ear: "R", kind: "bounce",
    blockedBy: [], boardId: "b4",
    occluders: [],
    legs: [7.27824, 6.05773],
    strength: 0.86, flip: false, shadow: 1,
  },
  {
    id: "d1.B.L.direct", doorId: "d1", postId: "B",
    ear: "L", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [9.1514],
    strength: 1, flip: false, shadow: 1,
  },
  {
    id: "d1.B.R.direct", doorId: "d1", postId: "B",
    ear: "R", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [9.28806],
    strength: 1, flip: false, shadow: 0.3503,
  },
  {
    id: "d2.A.L.direct", doorId: "d2", postId: "A",
    ear: "L", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [6.74893],
    strength: 1, flip: false, shadow: 0.5391,
  },
  {
    id: "d2.A.L.b1", doorId: "d2", postId: "A",
    ear: "L", kind: "bounce",
    blockedBy: [], boardId: "b1",
    occluders: ["b4"],
    legs: [4.07206, 7.66711],
    strength: 0.68, flip: false, shadow: 0.30631,
  },
  {
    id: "d2.A.R.direct", doorId: "d2", postId: "A",
    ear: "R", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [6.66844],
    strength: 1, flip: false, shadow: 1,
  },
  {
    id: "d2.A.R.b1", doorId: "d2", postId: "A",
    ear: "R", kind: "bounce",
    blockedBy: [], boardId: "b1",
    occluders: ["b4"],
    legs: [4.09151, 7.49331],
    strength: 0.68, flip: false, shadow: 1,
  },
  {
    id: "d2.A.R.b5", doorId: "d2", postId: "A",
    ear: "R", kind: "bounce",
    blockedBy: [], boardId: "b5",
    occluders: [],
    legs: [2.13753, 6.28435],
    strength: 0.85, flip: true, shadow: 1,
  },
  {
    id: "d2.B.L.direct", doorId: "d2", postId: "B",
    ear: "L", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [6.66844],
    strength: 1, flip: false, shadow: 1,
  },
  {
    id: "d2.B.R.direct", doorId: "d2", postId: "B",
    ear: "R", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [6.74893],
    strength: 1, flip: false, shadow: 0.5391,
  },
  {
    id: "d3.A.L.direct", doorId: "d3", postId: "A",
    ear: "L", kind: "direct",
    blockedBy: ["b5"], boardId: null,
    occluders: [],
    legs: [9.28806],
    strength: 1, flip: false, shadow: 0.3503,
  },
  {
    id: "d3.A.R.direct", doorId: "d3", postId: "A",
    ear: "R", kind: "direct",
    blockedBy: ["b5"], boardId: null,
    occluders: [],
    legs: [9.1514],
    strength: 1, flip: false, shadow: 1,
  },
  {
    id: "d3.B.L.direct", doorId: "d3", postId: "B",
    ear: "L", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [6.0982],
    strength: 1, flip: false, shadow: 0.79682,
  },
  {
    id: "d3.B.R.direct", doorId: "d3", postId: "B",
    ear: "R", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [6.06862],
    strength: 1, flip: false, shadow: 1,
  },
];

const LEVEL_TWO_SCENARIOS: EchoScenario[] = [
  {
    id: "pa",
    plates: ["pa"], postIds: ["A", "B"], doorIds: ["d1", "d2"],
  },
  {
    id: "pb",
    plates: ["pb"], postIds: ["A", "B"], doorIds: ["d2", "d3"],
  },
  {
    id: "pa+pb",
    plates: ["pa", "pb"], postIds: ["A", "B"], doorIds: ["d1", "d2", "d3"],
  },
];

export const LEVEL_TWO: EchoLevelData = {
  id: "echo-02", title: "两块封条",
  blurb: "门与封板交错牵连，同一扇门会被两块踏板同时打开。一条封条不够用了。",
  width: 11, height: 9, rows: [...LEVEL_TWO_ROWS],
  player: { x: 5, y: 7 },
  boxes: [
    { kind: "timber", x: 3, y: 6 },
    { kind: "timber", x: 6, y: 6 },
  ],
  plates: [
    { id: "pa", x: 3, y: 5, accept: "timber", doorIds: ["d1", "d2"], boardIds: ["b4", "b1", "b2"] },
    { id: "pb", x: 6, y: 5, accept: "timber", doorIds: ["d2", "d3"], boardIds: ["b3", "b5"] },
  ],
  doors: [
    { id: "d1", x: 1, y: 0 },
    { id: "d2", x: 5, y: 0 },
    { id: "d3", x: 9, y: 0 },
  ],
  posts: [
    { id: "A", x: 2, y: 6, name: "甲位" },
    { id: "B", x: 8, y: 6, name: "乙位" },
  ],
  baffles: [
    { id: "b1", x: 8, y: 2, side: "e", strength: 0.68, flip: false },
    { id: "b2", x: 2, y: 3, side: "s", strength: 0.91, flip: false },
    { id: "b3", x: 3, y: 4, side: "e", strength: 0.94, flip: true },
    { id: "b4", x: 7, y: 3, side: "e", strength: 0.86, flip: false },
    { id: "b5", x: 6, y: 2, side: "e", strength: 0.85, flip: true },
  ],
  routes: LEVEL_TWO_ROUTES,
  scenarios: LEVEL_TWO_SCENARIOS,
  poles: [196.0, 262.0, 330.0, 415.0], tolerance: 1,
  stripBudget: 2, solution: ["b3", "b5"],
  gainExample: {"plates": ["pb"], "post": "A", "door": "d2", "ear": "R", "freq": 196.0, "before": -26.19, "after": -16.48},
};

const LEVEL_THREE_ROWS = [
  "###########",
  "#.........#",
  "#.........#",
  "#.........#",
  "#.........#",
  "#.........#",
  "#.........#",
  "#.........#",
  "###########",
] as const;

const LEVEL_THREE_ROUTES: EchoRoute[] = [
  {
    id: "d1.A.L.direct", doorId: "d1", postId: "A",
    ear: "L", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [6.06862],
    strength: 1, flip: false, shadow: 1,
  },
  {
    id: "d1.A.R.direct", doorId: "d1", postId: "A",
    ear: "R", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [6.0982],
    strength: 1, flip: false, shadow: 0.79682,
  },
  {
    id: "d1.B.L.direct", doorId: "d1", postId: "B",
    ear: "L", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [9.1514],
    strength: 1, flip: false, shadow: 1,
  },
  {
    id: "d1.B.R.direct", doorId: "d1", postId: "B",
    ear: "R", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [9.28806],
    strength: 1, flip: false, shadow: 0.3503,
  },
  {
    id: "d2.A.L.direct", doorId: "d2", postId: "A",
    ear: "L", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [6.74893],
    strength: 1, flip: false, shadow: 0.5391,
  },
  {
    id: "d2.A.L.b3", doorId: "d2", postId: "A",
    ear: "L", kind: "bounce",
    blockedBy: [], boardId: "b3",
    occluders: ["b6"],
    legs: [3.11253, 6.95962],
    strength: 0.62, flip: true, shadow: 0.3318,
  },
  {
    id: "d2.A.R.direct", doorId: "d2", postId: "A",
    ear: "R", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [6.66844],
    strength: 1, flip: false, shadow: 1,
  },
  {
    id: "d2.A.R.b3", doorId: "d2", postId: "A",
    ear: "R", kind: "bounce",
    blockedBy: [], boardId: "b3",
    occluders: ["b6"],
    legs: [3.13785, 6.7903],
    strength: 0.62, flip: true, shadow: 1,
  },
  {
    id: "d2.B.L.direct", doorId: "d2", postId: "B",
    ear: "L", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [6.66844],
    strength: 1, flip: false, shadow: 1,
  },
  {
    id: "d2.B.R.direct", doorId: "d2", postId: "B",
    ear: "R", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [6.74893],
    strength: 1, flip: false, shadow: 0.5391,
  },
  {
    id: "d3.A.L.direct", doorId: "d3", postId: "A",
    ear: "L", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [9.28806],
    strength: 1, flip: false, shadow: 0.3503,
  },
  {
    id: "d3.A.R.direct", doorId: "d3", postId: "A",
    ear: "R", kind: "direct",
    blockedBy: [], boardId: null,
    occluders: [],
    legs: [9.1514],
    strength: 1, flip: false, shadow: 1,
  },
  {
    id: "d3.B.L.direct", doorId: "d3", postId: "B",
    ear: "L", kind: "direct",
    blockedBy: ["b4"], boardId: null,
    occluders: [],
    legs: [6.0982],
    strength: 1, flip: false, shadow: 0.79682,
  },
  {
    id: "d3.B.L.b1", doorId: "d3", postId: "B",
    ear: "L", kind: "bounce",
    blockedBy: [], boardId: "b1",
    occluders: ["b3", "b6"],
    legs: [4.57901, 2.58256],
    strength: 0.76, flip: false, shadow: 1,
  },
  {
    id: "d3.B.L.b7", doorId: "d3", postId: "B",
    ear: "L", kind: "bounce",
    blockedBy: [], boardId: "b7",
    occluders: ["b3", "b6"],
    legs: [4.57901, 2.58256],
    strength: 0.77, flip: false, shadow: 1,
  },
  {
    id: "d3.B.R.direct", doorId: "d3", postId: "B",
    ear: "R", kind: "direct",
    blockedBy: ["b4"], boardId: null,
    occluders: [],
    legs: [6.06862],
    strength: 1, flip: false, shadow: 1,
  },
  {
    id: "d3.B.R.b1", doorId: "d3", postId: "B",
    ear: "R", kind: "bounce",
    blockedBy: [], boardId: "b1",
    occluders: ["b3", "b6"],
    legs: [4.43852, 2.8229],
    strength: 0.76, flip: false, shadow: 0.47366,
  },
  {
    id: "d3.B.R.b7", doorId: "d3", postId: "B",
    ear: "R", kind: "bounce",
    blockedBy: [], boardId: "b7",
    occluders: ["b3", "b6"],
    legs: [4.43852, 2.8229],
    strength: 0.77, flip: false, shadow: 0.47366,
  },
];

const LEVEL_THREE_SCENARIOS: EchoScenario[] = [
  {
    id: "pa",
    plates: ["pa"], postIds: ["A", "B"], doorIds: ["d1", "d2"],
  },
  {
    id: "pb",
    plates: ["pb"], postIds: ["A", "B"], doorIds: ["d2", "d3"],
  },
  {
    id: "pc",
    plates: ["pc"], postIds: ["A", "B"], doorIds: ["d1", "d3"],
  },
  {
    id: "pa+pb",
    plates: ["pa", "pb"], postIds: ["A", "B"], doorIds: ["d1", "d2", "d3"],
  },
  {
    id: "pa+pc",
    plates: ["pa", "pc"], postIds: ["A", "B"], doorIds: ["d1", "d2", "d3"],
  },
  {
    id: "pb+pc",
    plates: ["pb", "pc"], postIds: ["A", "B"], doorIds: ["d1", "d2", "d3"],
  },
  {
    id: "pa+pb+pc",
    plates: ["pa", "pb", "pc"], postIds: ["A", "B"], doorIds: ["d1", "d2", "d3"],
  },
];

export const LEVEL_THREE: EchoLevelData = {
  id: "echo-03", title: "三色封廊",
  blurb: "三块踏板两两交叉控制三道门，每次组合都会改变站立封板的阵形。最少要贴几条？",
  width: 11, height: 9, rows: [...LEVEL_THREE_ROWS],
  player: { x: 5, y: 7 },
  boxes: [
    { kind: "timber", x: 3, y: 6 },
    { kind: "timber", x: 6, y: 6 },
    { kind: "timber", x: 9, y: 6 },
  ],
  plates: [
    { id: "pa", x: 3, y: 5, accept: "timber", doorIds: ["d1", "d2"], boardIds: ["b5", "b6", "b3"] },
    { id: "pb", x: 6, y: 5, accept: "timber", doorIds: ["d2", "d3"], boardIds: ["b1", "b7"] },
    { id: "pc", x: 9, y: 5, accept: "timber", doorIds: ["d1", "d3"], boardIds: ["b4", "b2"] },
  ],
  doors: [
    { id: "d1", x: 1, y: 0 },
    { id: "d2", x: 5, y: 0 },
    { id: "d3", x: 9, y: 0 },
  ],
  posts: [
    { id: "A", x: 2, y: 6, name: "甲位" },
    { id: "B", x: 8, y: 6, name: "乙位" },
  ],
  baffles: [
    { id: "b1", x: 7, y: 4, side: "w", strength: 0.76, flip: false },
    { id: "b2", x: 5, y: 3, side: "n", strength: 0.68, flip: false },
    { id: "b3", x: 8, y: 2, side: "w", strength: 0.62, flip: true },
    { id: "b4", x: 9, y: 2, side: "n", strength: 0.9, flip: false },
    { id: "b5", x: 2, y: 4, side: "w", strength: 0.62, flip: true },
    { id: "b6", x: 7, y: 3, side: "n", strength: 0.86, flip: false },
    { id: "b7", x: 6, y: 4, side: "e", strength: 0.77, flip: false },
  ],
  routes: LEVEL_THREE_ROUTES,
  scenarios: LEVEL_THREE_SCENARIOS,
  poles: [196.0, 262.0, 330.0, 415.0], tolerance: 1,
  stripBudget: 2, solution: ["b1", "b7"],
  gainExample: {"plates": ["pb"], "post": "B", "door": "d3", "ear": "R", "freq": 196.0, "before": -16.31, "after": -15.66},
};

export const ECHO_LEVELS: EchoLevelData[] = [LEVEL_ONE, LEVEL_TWO, LEVEL_THREE];

/** Parse a level's text rows into tiles. */
export function rowsToTiles(rows: string[]): TileKind[][] {
  return rows.map((row) =>
    [...row].map((ch) => {
      if (ch === "#") return "wall";
      if (ch === "*") return "goal";
      if (ch === "~") return "gap";
      return "floor";
    }),
  );
}
