import floor from "@stdlib/math-base-special-floor/lib/index.js";
import hypot from "@stdlib/math-base-special-hypot/lib/index.js";
import SQRT2 from "@stdlib/constants-float64-sqrt-two/lib/index.js";

export function createBird(anchor) {
  return {
    kind: "bird",
    type: "red",
    x: anchor.x,
    y: anchor.y,
    vx: 0,
    vy: 0,
    radius: 18,
    mass: 1.8,
    spin: 0,
    launched: false,
    dragging: false,
    spent: false,
    restTimer: 0,
    hitCooldown: 0,
    launch: null,
    trail: []
  };
}

export function createPig(config) {
  return {
    kind: "pig",
    x: config.x,
    y: config.y,
    vx: 0,
    vy: 0,
    radius: config.radius ?? 22,
    mass: 1.2,
    maxHealth: config.health ?? 120,
    health: config.health ?? 120,
    alive: true,
    grounded: false,
    supportBlock: null,
    restTimer: 0,
    wobbleSeed: (config.x + config.y) * 0.01
  };
}

export function createBlock(config) {
  const diagonal = hypot(config.w, config.h) / SQRT2;
  const maxHealth = config.health ?? floor(diagonal * 2.3 + 66);

  return {
    kind: "block",
    x: config.x,
    y: config.y,
    w: config.w,
    h: config.h,
    maxHealth,
    health: maxHealth,
    alive: true
  };
}
