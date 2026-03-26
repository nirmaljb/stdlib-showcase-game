import round from "@stdlib/math-base-special-round/lib/index.js";
import uniform from "@stdlib/random-base-uniform/lib/index.js";
import { createBlock, createPig } from "./entities.js";
import { GROUND_Y } from "./physics.js";

function groundPig(x) {
  return { x, y: GROUND_Y - 22 };
}

function towerPig(x, lift, beamHeight = 16, radius = 22) {
  return {
    x,
    y: GROUND_Y - lift - beamHeight - radius
  };
}

function groundBlock(x, w, h, lift = 0) {
  return {
    x,
    y: GROUND_Y - h / 2 - lift,
    w,
    h
  };
}

export const LEVELS = [
  {
    name: "Barn Door",
    birds: 4,
    subtitle: "One exposed pig and one perched above the tower.",
    pigs: [
      groundPig(620),
      { x: 708, y: GROUND_Y - 132 }
    ],
    blocks: [
      groundBlock(676, 24, 94),
      groundBlock(740, 24, 94),
      groundBlock(708, 100, 16, 94),
      groundBlock(810, 22, 72),
      groundBlock(852, 22, 72),
      groundBlock(831, 78, 14, 72)
    ]
  },
  {
    name: "Canyon Shelf",
    birds: 4,
    subtitle: "Two perched pigs: the front tower is higher than the rear.",
    pigs: [
      towerPig(690, 96),
      towerPig(760, 64)
    ],
    blocks: [
      groundBlock(652, 28, 96),
      groundBlock(728, 28, 96),
      groundBlock(690, 128, 16, 96),
      groundBlock(732, 24, 64),
      groundBlock(788, 24, 64),
      groundBlock(760, 108, 16, 64)
    ]
  },
  {
    name: "Triple Stack",
    birds: 5,
    subtitle: "Two pigs climb the tower while one waits just past max range.",
    pigs: [
      towerPig(700, 92),
      towerPig(734, 160),
      groundPig(798)
    ],
    blocks: [
      groundBlock(664, 26, 92),
      groundBlock(736, 26, 92),
      groundBlock(700, 120, 16, 92),
      groundBlock(708, 22, 52, 108),
      groundBlock(760, 22, 52, 108),
      groundBlock(734, 104, 16, 160)
    ]
  }
];

export function createLevel(index) {
  const definition = LEVELS[index % LEVELS.length];

  return {
    ...definition,
    wind: round(uniform(-65, 65)),
    pigs: definition.pigs.map(createPig),
    blocks: definition.blocks.map(createBlock)
  };
}
