import type { RuntimeLevel } from "@/shared/types";
import { ECHO_LEVELS, rowsToTiles, type EchoLevelData } from "./data";

/**
 * Hydrate a static echo blueprint into the mutable runtime shape the rest of the
 * app already understands. Boxes get instance ids; boards start lowered; doors
 * start shut. Gadget evaluation then decides what stands and what opens.
 */
export function hydrateEcho(data: EchoLevelData): RuntimeLevel {
  return {
    id: data.id,
    title: data.title,
    blurb: data.blurb,
    width: data.width,
    height: data.height,
    tiles: rowsToTiles([...data.rows]),
    player: { ...data.player },
    boxes: data.boxes.map((box, index) => ({
      id: `box-${data.id}-${index}`,
      kind: box.kind,
      x: box.x,
      y: box.y,
    })),
    plates: data.plates.map((plate) => ({
      id: plate.id,
      x: plate.x,
      y: plate.y,
      accept: plate.accept,
      doorIds: [...plate.doorIds],
      floorIds: [],
      boardIds: [...plate.boardIds],
      powered: false,
    })),
    doors: data.doors.map((door) => ({ ...door, open: false })),
    floors: [],
    baffles: data.baffles.map((baffle) => ({
      ...baffle,
      raised: false,
      stripped: false,
    })),
    posts: data.posts.map((post) => ({ ...post })),
    routes: data.routes.map((route) => ({
      ...route,
      blockedBy: [...route.blockedBy],
      occluders: [...route.occluders],
      legs: [...route.legs],
    })),
    scenarios: data.scenarios.map((scenario) => ({
      ...scenario,
      plates: [...scenario.plates],
      postIds: [...scenario.postIds],
      doorIds: [...scenario.doorIds],
    })),
    poles: [...data.poles],
    tolerance: data.tolerance,
    stripBudget: data.stripBudget,
    mode: "echo",
  };
}

export function echoBlueprint(id: string): EchoLevelData {
  const found = ECHO_LEVELS.find((level) => level.id === id);
  if (!found) throw new Error(`未知回声关卡 ${id}`);
  return found;
}

export function echoLevelIds(): string[] {
  return ECHO_LEVELS.map((level) => level.id);
}

export { ECHO_LEVELS };
export type { EchoLevelData };
