import max from "@stdlib/math-base-special-max/lib/index.js";
import min from "@stdlib/math-base-special-min/lib/index.js";
import round from "@stdlib/math-base-special-round/lib/index.js";
import {
  FIXED_DT,
  GROUND_Y,
  MIN_PULL,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  advanceBird,
  advancePig,
  applyExponentialDecay,
  launchStateFromPull
} from "./physics.js";
import { circleCircleContact, circleRectContact, impactSpeed, isApproaching, findSupportBlock, getSlidingDirection, pigBlockContact } from "./collision.js";
import { createBird } from "./entities.js";
import { createLevel, LEVELS } from "./level.js";
import { comboMultiplier, createScoreState, impactForce, registerBonus, registerImpact, tickScoreState } from "./score.js";
import { computeTrajectory } from "./trajectory.js";
import { drawScene } from "./ui.js";
import { magnitude, reflect } from "./vector.js";

const SLINGSHOT_ANCHOR = { x: 196, y: GROUND_Y - 42 };
const BOUNDS = { width: WORLD_WIDTH, height: WORLD_HEIGHT };

function createState() {
  const score = createScoreState();

  return {
    anchor: { ...SLINGSHOT_ANCHOR },
    pointer: { x: 0, y: 0, down: false },
    currentPull: null,
    previewPoints: [],
    previewMetrics: null,
    overlayVisible: true,
    elapsed: 0,
    shake: 0,
    score,
    comboMultiplier: 1,
    status: "aiming",
    levelIndex: 0,
    level: createLevel(0),
    activeBird: null,
    remainingBirds: 0,
    nextBirdTimer: 0,
    overlayMetrics: {
      theta: 0,
      speed: 0,
      vx: 0,
      vy: 0,
      wind: 0,
      range: 0,
      maxHeight: 0,
      timeOfFlight: 0,
      currentSpeed: 0
    }
  };
}

function canvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

function spawnBird(state) {
  if (state.remainingBirds <= 0) {
    state.activeBird = null;
    state.status = "game-over";
    return false;
  }

  state.activeBird = createBird(state.anchor);
  state.remainingBirds -= 1;
  state.currentPull = null;
  state.previewPoints = [];
  state.previewMetrics = null;
  state.status = "aiming";
  return true;
}

function loadLevel(state, index, preserveScore = true) {
  state.levelIndex = index;
  state.level = createLevel(index);
  state.remainingBirds = state.level.birds;
  state.status = "aiming";
  state.nextBirdTimer = 0;
  state.shake = 0;
  state.currentPull = null;
  state.previewPoints = [];
  state.previewMetrics = null;

  if (!preserveScore) {
    state.score = createScoreState();
  }

  spawnBird(state);
}

function updateOverlay(state) {
  if (state.previewMetrics && state.activeBird && !state.activeBird.launched) {
    state.overlayMetrics = {
      theta: state.previewMetrics.theta,
      speed: state.previewMetrics.speed,
      vx: state.previewMetrics.velocity.x,
      vy: state.previewMetrics.velocity.y,
      wind: state.level.wind,
      range: state.previewMetrics.groundRange,
      maxHeight: state.previewMetrics.maxHeight,
      timeOfFlight: state.previewMetrics.timeToGround,
      currentSpeed: state.previewMetrics.speed
    };
    return;
  }

  if (state.activeBird?.launched && state.activeBird.launch) {
    const currentSpeed = magnitude({ x: state.activeBird.vx, y: state.activeBird.vy });
    state.overlayMetrics = {
      theta: state.activeBird.launch.theta,
      speed: state.activeBird.launch.speed,
      vx: state.activeBird.vx,
      vy: state.activeBird.vy,
      wind: state.level.wind,
      range: state.activeBird.launch.groundRange,
      maxHeight: state.activeBird.launch.maxHeight,
      timeOfFlight: state.activeBird.launch.timeToGround,
      currentSpeed
    };
    return;
  }

  state.overlayMetrics = {
    theta: 0,
    speed: 0,
    vx: 0,
    vy: 0,
    wind: state.level.wind,
    range: 0,
    maxHeight: 0,
    timeOfFlight: 0,
    currentSpeed: 0
  };
}

function refreshPreview(state) {
  if (!state.currentPull) {
    state.previewPoints = [];
    state.previewMetrics = null;
    updateOverlay(state);
    return;
  }

  const preview = computeTrajectory(
    state.anchor,
    state.currentPull,
    state.level.wind,
    BOUNDS,
    state.activeBird.radius
  );
  state.previewPoints = preview.points;
  state.previewMetrics = preview.metrics;
  updateOverlay(state);
}

function launchBird(state) {
  if (!state.activeBird || !state.currentPull) {
    return;
  }

  const launch = launchStateFromPull(
    state.anchor,
    state.currentPull,
    state.level.wind,
    state.activeBird.radius
  );

  if (launch.speed < MIN_PULL * 2.2) {
    state.activeBird.x = state.anchor.x;
    state.activeBird.y = state.anchor.y;
    state.activeBird.dragging = false;
    state.currentPull = null;
    refreshPreview(state);
    return;
  }

  state.activeBird.dragging = false;
  state.activeBird.launched = true;
  state.activeBird.x = launch.origin.x;
  state.activeBird.y = launch.origin.y;
  state.activeBird.vx = launch.velocity.x;
  state.activeBird.vy = launch.velocity.y;
  state.activeBird.spin = launch.theta;
  state.activeBird.launch = launch;
  state.activeBird.trail = [];
  state.currentPull = null;
  state.previewPoints = [];
  state.previewMetrics = null;
  state.status = "flying";
  updateOverlay(state);
}

function bounceBird(bird, contact, restitution, dampening) {
  bird.x += contact.normal.x * contact.overlap;
  bird.y += contact.normal.y * contact.overlap;

  const velocity = reflect({ x: bird.vx, y: bird.vy }, contact.normal, restitution);
  bird.vx = velocity.x * dampening;
  bird.vy = velocity.y * dampening;
}

function resolvePigHit(state, pig, contact) {
  const bird = state.activeBird;
  const velocity = { x: bird.vx, y: bird.vy };

  if (!isApproaching(velocity, contact.normal)) {
    bird.x += contact.normal.x * contact.overlap;
    bird.y += contact.normal.y * contact.overlap;
    return;
  }

  const force = impactForce(bird.mass, velocity, contact.normal);
  pig.health -= force * 1.08;
  state.shake = max(state.shake, min(force / 280, 1));
  registerImpact(state.score, force, "pig");
  bounceBird(bird, contact, 0.38, 0.72);
  bird.hitCooldown = 0.08;

  if (pig.health <= 0) {
    pig.alive = false;
    registerBonus(state.score, "Fortress Down", 240);
  }
}

function resolveBlockHit(state, block, contact) {
  const bird = state.activeBird;
  const velocity = { x: bird.vx, y: bird.vy };

  if (!isApproaching(velocity, contact.normal)) {
    bird.x += contact.normal.x * contact.overlap;
    bird.y += contact.normal.y * contact.overlap;
    return;
  }

  const force = impactForce(bird.mass, velocity, contact.normal);
  block.health -= force * 0.86;
  state.shake = max(state.shake, min(force / 360, 0.85));
  registerImpact(state.score, force, "block");
  bounceBird(bird, contact, 0.32, 0.7);
  bird.hitCooldown = 0.08;

  if (block.health <= 0) {
    block.alive = false;
    registerBonus(state.score, "Timber", 120);
  }
}

function resolveCollisions(state) {
  const bird = state.activeBird;
  if (!bird || !bird.launched || bird.hitCooldown > 0) {
    return;
  }

  for (const pig of state.level.pigs) {
    if (!pig.alive) {
      continue;
    }

    const contact = circleCircleContact(bird, pig);
    if (contact) {
      resolvePigHit(state, pig, contact);
      return;
    }
  }

  for (const block of state.level.blocks) {
    if (!block.alive) {
      continue;
    }

    const contact = circleRectContact(bird, block);
    if (contact) {
      resolveBlockHit(state, block, contact);
      return;
    }
  }
}

/**
 * Update support tracking for all pigs and apply physics when support is lost.
 */
function updatePigSupports(state) {
  const { pigs, blocks } = state.level;

  for (const pig of pigs) {
    if (!pig.alive) {
      continue;
    }

    // Check if pig is on the ground
    const onGround = pig.y + pig.radius >= GROUND_Y - 2;
    if (onGround && pig.grounded) {
      pig.supportBlock = null;
      continue;
    }

    // Find current support block
    const currentSupport = findSupportBlock(pig, blocks);

    // If pig had a support but it's now destroyed, start falling
    if (pig.supportBlock && !pig.supportBlock.alive) {
      pig.supportBlock = null;
      // Give a small initial velocity to start the fall
      if (pig.vy === 0) {
        pig.vy = 20;
      }
    }

    // If pig is on a new support block
    if (currentSupport) {
      // Check for sliding
      const slideDir = getSlidingDirection(pig, currentSupport);
      if (slideDir !== 0) {
        // Apply sliding force
        pig.vx += slideDir * 85 * FIXED_DT;
        // Small upward impulse to lift off the block edge
        if (pig.vy === 0) {
          pig.vy = -15;
        }
      } else {
        // Resting stably on block
        pig.supportBlock = currentSupport;
        pig.grounded = true;

        // Settle the pig on top of the block
        const blockTop = currentSupport.y - currentSupport.h / 2;
        pig.y = blockTop - pig.radius;
        pig.vy = 0;
        pig.vx *= 0.85; // Friction
      }
    } else if (!onGround) {
      // No support and not on ground - pig is falling
      pig.supportBlock = null;
      pig.grounded = false;
    }
  }
}

/**
 * Resolve pig collisions with blocks during falling.
 */
function resolvePigBlockCollisions(state) {
  const { pigs, blocks } = state.level;

  for (const pig of pigs) {
    if (!pig.alive || pig.grounded) {
      continue;
    }

    for (const block of blocks) {
      if (!block.alive) {
        continue;
      }

      const contact = pigBlockContact(pig, block);
      if (!contact) {
        continue;
      }

      // Separate pig from block
      pig.x += contact.normal.x * contact.overlap;
      pig.y += contact.normal.y * contact.overlap;

      // Check if landing on top of block
      if (contact.normal.y < -0.7) {
        // Landing on top
        pig.vy = 0;
        pig.vx *= 0.8;
        pig.grounded = true;
        pig.supportBlock = block;

        // Apply landing damage if falling fast
        const impactVelocity = magnitude({ x: pig.vx, y: pig.vy });
        if (impactVelocity > 80) {
          const damage = impactVelocity * 0.12;
          pig.health -= damage;
          state.shake = max(state.shake, min(damage / 200, 0.5));
        }
      } else if (contact.normal.y > 0.7) {
        // Hit from below - bounce down
        pig.vy = max(pig.vy, 30);
      } else {
        // Side collision - bounce horizontally
        pig.vx = -pig.vx * 0.5;
      }

      if (pig.health <= 0) {
        pig.alive = false;
        registerBonus(state.score, "Gravity Kill", 180);
      }
    }
  }
}

/**
 * Update all pig physics each tick.
 */
function updatePigs(state) {
  updatePigSupports(state);

  for (const pig of state.level.pigs) {
    if (!pig.alive) {
      continue;
    }

    // Only advance physics if pig is not stably resting
    if (!pig.grounded || magnitude({ x: pig.vx, y: pig.vy }) > 8) {
      advancePig(pig, FIXED_DT);
    }
  }

  resolvePigBlockCollisions(state);
}

function finalizeShot(state) {
  const bird = state.activeBird;
  if (!bird || bird.spent) {
    return;
  }

  const speed = magnitude({ x: bird.vx, y: bird.vy });
  const outOfBounds =
    bird.x > WORLD_WIDTH + 180 ||
    bird.x < -180 ||
    bird.y > WORLD_HEIGHT + 180 ||
    bird.y < -180;

  if (bird.restTimer > 0.48 || outOfBounds || (bird.y + bird.radius >= GROUND_Y && speed < 18)) {
    bird.spent = true;
    bird.launched = false;
    state.nextBirdTimer = 0.55;
  }
}

function evaluateProgress(state) {
  const pigsAlive = state.level.pigs.some((pig) => pig.alive);

  if (!pigsAlive && state.status !== "level-clear") {
    registerBonus(state.score, "Stage Cleared", 600 + state.remainingBirds * 500);
    state.status = "level-clear";
    state.previewPoints = [];
    state.previewMetrics = null;
    return;
  }

  if (state.status === "flying" && state.activeBird?.spent && pigsAlive) {
    state.nextBirdTimer = max(state.nextBirdTimer, 0.55);
  }

  if (state.nextBirdTimer > 0 && state.status !== "level-clear") {
    state.nextBirdTimer -= FIXED_DT;
    if (state.nextBirdTimer <= 0 && pigsAlive) {
      spawnBird(state);
    }
  }

  if (pigsAlive && !state.activeBird && state.remainingBirds <= 0) {
    state.status = "game-over";
  }
}

function updateBirdTrail(bird) {
  bird.trail.push({ x: bird.x, y: bird.y, r: 6 });
  if (bird.trail.length > 18) {
    bird.trail.shift();
  }
  for (const node of bird.trail) {
    node.r *= 0.98;
  }
}

function tick(state) {
  state.elapsed += FIXED_DT;
  state.shake = applyExponentialDecay(state.shake, 10.5, FIXED_DT);
  tickScoreState(state.score, FIXED_DT);
  state.comboMultiplier = state.score.combo > 0 ? comboMultiplier(state.score.combo) : 1;

  if (state.activeBird?.hitCooldown > 0) {
    state.activeBird.hitCooldown = max(0, state.activeBird.hitCooldown - FIXED_DT);
  }

  if (state.activeBird?.launched) {
    advanceBird(state.activeBird, FIXED_DT, state.level.wind);
    updateBirdTrail(state.activeBird);
    resolveCollisions(state);
    finalizeShot(state);
    updateOverlay(state);

    if (state.activeBird.spent) {
      state.activeBird = null;
    }
  }

  // Update pig physics (falling, sliding when support is destroyed)
  updatePigs(state);

  evaluateProgress(state);
}

function startDrag(state, point) {
  if (!state.activeBird || state.activeBird.launched || state.status !== "aiming") {
    return;
  }

  const distance = magnitude({
    x: point.x - state.activeBird.x,
    y: point.y - state.activeBird.y
  });

  if (distance > state.activeBird.radius + 26) {
    return;
  }

  state.activeBird.dragging = true;
  state.pointer.down = true;
}

function dragBird(state, point) {
  if (!state.activeBird?.dragging) {
    return;
  }

  state.pointer.x = point.x;
  state.pointer.y = point.y;
  state.currentPull = {
    x: point.x - state.anchor.x,
    y: point.y - state.anchor.y
  };

  const preview = computeTrajectory(
    state.anchor,
    state.currentPull,
    state.level.wind,
    BOUNDS,
    state.activeBird.radius
  );
  const clampedPull = preview.metrics.pull;

  state.activeBird.x = state.anchor.x + clampedPull.x;
  state.activeBird.y = state.anchor.y + clampedPull.y;
  state.currentPull = clampedPull;
  state.previewPoints = preview.points;
  state.previewMetrics = preview.metrics;
  updateOverlay(state);
}

function stopDrag(state) {
  if (!state.activeBird?.dragging) {
    return;
  }
  state.pointer.down = false;
  launchBird(state);
}

export function createGame(canvas) {
  const ctx = canvas.getContext("2d");
  const state = createState();
  let animationFrame = 0;
  let accumulator = 0;
  let lastTime = performance.now();

  loadLevel(state, 0, false);
  updateOverlay(state);

  const onPointerDown = (event) => {
    startDrag(state, canvasPoint(canvas, event));
  };

  const onPointerMove = (event) => {
    dragBird(state, canvasPoint(canvas, event));
  };

  const onPointerUp = () => {
    stopDrag(state);
  };

  const onKeyDown = (event) => {
    if (event.key === "m" || event.key === "M") {
      state.overlayVisible = !state.overlayVisible;
      return;
    }

    if (event.key === "r" || event.key === "R") {
      loadLevel(state, state.levelIndex, false);
      updateOverlay(state);
      return;
    }

    if ((event.key === "n" || event.key === "N") && state.status === "level-clear") {
      const nextLevel = (state.levelIndex + 1) % LEVELS.length;
      loadLevel(state, nextLevel, true);
      updateOverlay(state);
    }
  };

  const render = () => {
    drawScene(ctx, state);
  };

  const frame = (time) => {
    const delta = min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    accumulator += delta;

    while (accumulator >= FIXED_DT) {
      tick(state);
      accumulator -= FIXED_DT;
    }

    render();
    animationFrame = window.requestAnimationFrame(frame);
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("keydown", onKeyDown);

  animationFrame = window.requestAnimationFrame(frame);

  return {
    destroy() {
      window.cancelAnimationFrame(animationFrame);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
    }
  };
}
