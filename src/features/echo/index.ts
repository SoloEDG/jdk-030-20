export { useEcho } from "./model/useEcho";
export {
  checkStrips,
  eligibleBaffles,
  minimumStrips,
  occupiedPlates,
  openDoors,
  raisedBoards,
  readingTable,
  strippedBoardIds,
} from "./lib/solver";
export {
  combine,
  doorsDistinct,
  readDoor,
  routePhasor,
  toDb,
  type EarReading,
} from "./lib/acoustics";
export { boardBlocksStep, sharedEdge } from "./lib/blocking";
export { hydrateEcho, echoBlueprint, ECHO_LEVELS } from "./lib/catalog";
export { default as EchoPanel } from "./ui/EchoPanel.vue";
