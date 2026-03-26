import test from "node:test";
import assert from "node:assert/strict";
import {
  GROUND_Y,
  GRAVITY,
  MAX_LAUNCH_SPEED,
  MAX_PULL,
  RELEASE_CLEARANCE,
  advanceBird,
  advancePig,
  applyExponentialDecay,
  clampPull,
  launchStateFromPull,
  launchSpeedFromPull,
  maxHeight,
  positionAt,
  range,
  releasePoint,
  timeOfFlight,
  timeToVerticalPosition,
  wrapAngle
} from "../src/lib/physics.js";
import { magnitude } from "../src/lib/vector.js";
import { approx, approxPoint } from "./helpers.js";
import PI from "@stdlib/constants-float64-pi";
import E from "@stdlib/constants-float64-e";

test("pull and launch helpers clamp to the tuned sling limits", () => {
  const rawPull = { x: -300, y: 0 };
  const clamped = clampPull(rawPull);
  approx(magnitude(clamped), MAX_PULL);
  approx(launchSpeedFromPull(rawPull), MAX_LAUNCH_SPEED);

  const anchor = { x: 196, y: 598 };
  const launch = launchStateFromPull(anchor, rawPull, 0);
  approx(magnitude(launch.pull), MAX_PULL);
  approx(magnitude({
    x: launch.origin.x - anchor.x,
    y: launch.origin.y - anchor.y
  }), RELEASE_CLEARANCE);
});

test("projectile helpers match analytical expectations", () => {
  const vy0 = -50;
  const duration = timeOfFlight(vy0, 10);
  approx(duration, 10);
  approx(timeToVerticalPosition(80, vy0, 80, 10), duration);

  const distance = range(100, -PI / 4, 10, 20);
  approx(distance, 3000);

  const height = maxHeight(vy0, 10);
  approx(height, 125);

  const impact = positionAt({ x: 5, y: 80 }, { x: 70, y: vy0 }, 10, 20, duration);
  approxPoint(impact, { x: 1705, y: 80 });
});

test("release and ground-contact metrics use the visible projectile path", () => {
  const anchor = { x: 196, y: GROUND_Y - 42 };
  const radius = 18;
  const launch = launchStateFromPull(anchor, { x: -100, y: 60 }, 0, radius);
  const groundTime = timeToVerticalPosition(launch.origin.y, launch.velocity.y, GROUND_Y - radius, GRAVITY);
  const impact = positionAt(launch.origin, launch.velocity, GRAVITY, 0, groundTime);

  assert.deepEqual(releasePoint(anchor, { x: 0, y: 0 }), anchor);
  approx(launch.timeToGround, groundTime);
  approx(impact.y, GROUND_Y - radius);
  assert.ok(launch.origin.x > anchor.x);
  assert.ok(launch.origin.y < anchor.y);
  assert.ok(launch.timeToGround > launch.timeOfFlight);
  assert.ok(launch.groundRange > launch.range);
});

test("wrapAngle and exponential decay remain bounded and predictable", () => {
  approx(wrapAngle(-0.25), (2 * PI) - 0.25);
  approx(wrapAngle(9 * PI), PI);
  approx(applyExponentialDecay(10, 0.5, 2), 10 / E, 1e-9);
});

test("advanceBird bounces fast impacts and accumulates rest on soft landings", () => {
  const bouncingBird = {
    x: 0,
    y: GROUND_Y - 20,
    vx: 120,
    vy: 200,
    radius: 18,
    spin: (2 * PI) - 0.01,
    restTimer: 0
  };
  advanceBird(bouncingBird, 0.1, 0);
  approx(bouncingBird.y, GROUND_Y - bouncingBird.radius);
  assert.ok(bouncingBird.vy < 0);
  assert.equal(bouncingBird.restTimer, 0);
  assert.ok(bouncingBird.spin >= 0 && bouncingBird.spin < 2 * PI);

  const restingBird = {
    x: 0,
    y: GROUND_Y - 18,
    vx: 0,
    vy: 0,
    radius: 18,
    spin: 0,
    restTimer: 0
  };
  advanceBird(restingBird, 0.1, 0);
  approx(restingBird.y, GROUND_Y - restingBird.radius);
  assert.equal(restingBird.vy, 0);
  approx(restingBird.restTimer, 0.1);
});

test("advancePig applies gravity and handles ground collision with fall damage", () => {
  // Pig falling with high velocity should take fall damage
  const fallingPig = {
    x: 100,
    y: GROUND_Y - 50,
    vx: 0,
    vy: 150,
    radius: 22,
    mass: 1.2,
    health: 100,
    alive: true,
    grounded: false,
    restTimer: 0
  };

  // Advance until it hits the ground and settles
  for (let i = 0; i < 50; i++) {
    advancePig(fallingPig, 0.02);
  }

  // Pig should be at or very close to ground level (within a few pixels due to bounce settling)
  assert.ok(fallingPig.y >= GROUND_Y - fallingPig.radius - 5);
  assert.ok(fallingPig.y <= GROUND_Y - fallingPig.radius + 1);
  assert.ok(fallingPig.health < 100); // Should have taken fall damage
  assert.equal(fallingPig.grounded, true);
});

test("advancePig accumulates rest time when pig is stationary on ground", () => {
  const restingPig = {
    x: 100,
    y: GROUND_Y - 22,
    vx: 0,
    vy: 0,
    radius: 22,
    mass: 1.2,
    health: 100,
    alive: true,
    grounded: true,
    restTimer: 0
  };

  advancePig(restingPig, 0.1);
  approx(restingPig.restTimer, 0.1);
  assert.equal(restingPig.grounded, true);
});

test("advancePig does not process dead pigs", () => {
  const deadPig = {
    x: 100,
    y: 300,
    vx: 0,
    vy: 100,
    radius: 22,
    mass: 1.2,
    health: 0,
    alive: false,
    grounded: false,
    restTimer: 0
  };

  const initialY = deadPig.y;
  advancePig(deadPig, 0.1);

  // Dead pig should not move
  assert.equal(deadPig.y, initialY);
});

test("advancePig applies gravity correctly over time", () => {
  const pig = {
    x: 100,
    y: 200,
    vx: 0,
    vy: 0,
    radius: 22,
    mass: 1.2,
    health: 100,
    alive: true,
    grounded: false,
    restTimer: 0
  };

  const dt = 0.1;
  const initialY = pig.y;

  // After one tick, velocity should increase by gravity * dt
  advancePig(pig, dt);

  // vy should be GRAVITY * dt = 620 * 0.1 = 62
  approx(pig.vy, GRAVITY * dt);

  // Position should be initial + vy * dt (using initial vy of 0, so mostly gravity effect)
  // y = y0 + vy0*dt + 0.5*g*dt^2, but advancePig applies velocity after gravity
  // So: vy becomes 62, then y += 62 * 0.1 = 6.2
  assert.ok(pig.y > initialY);
});

test("advancePig applies horizontal friction on ground", () => {
  const pig = {
    x: 100,
    y: GROUND_Y - 22,
    vx: 100,
    vy: 0,
    radius: 22,
    mass: 1.2,
    health: 100,
    alive: true,
    grounded: true,
    restTimer: 0
  };

  const initialVx = pig.vx;

  // Advance a few ticks
  for (let i = 0; i < 10; i++) {
    advancePig(pig, 0.02);
  }

  // Horizontal velocity should decrease due to friction
  assert.ok(pig.vx < initialVx);
  assert.ok(pig.vx > 0); // But still moving right
});

test("advancePig kills pig when health drops to zero from fall damage", () => {
  const pig = {
    x: 100,
    y: 100, // High up
    vx: 0,
    vy: 0,
    radius: 22,
    mass: 1.2,
    health: 30, // Low health
    alive: true,
    grounded: false,
    restTimer: 0
  };

  // Let it fall for a while to build up speed
  for (let i = 0; i < 100; i++) {
    advancePig(pig, 0.02);
    if (!pig.alive) break;
  }

  // Pig should be dead from fall damage (started with only 30 health)
  assert.equal(pig.alive, false);
  assert.ok(pig.health <= 0);
});

test("advancePig soft landing does not cause damage", () => {
  const pig = {
    x: 100,
    y: GROUND_Y - 30, // Just slightly above ground
    vx: 0,
    vy: 40, // Slow fall, below damage threshold of 60
    radius: 22,
    mass: 1.2,
    health: 100,
    alive: true,
    grounded: false,
    restTimer: 0
  };

  advancePig(pig, 0.02);

  // Should hit ground but not take damage due to low velocity
  assert.equal(pig.health, 100);
  assert.equal(pig.alive, true);
});
