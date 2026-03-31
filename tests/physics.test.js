import test from "tape";
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

test("pull and launch helpers clamp to the tuned sling limits", (t) => {
  const rawPull = { x: -300, y: 0 };
  const clamped = clampPull(rawPull);
  approx(t, magnitude(clamped), MAX_PULL);
  approx(t, launchSpeedFromPull(rawPull), MAX_LAUNCH_SPEED);

  const anchor = { x: 196, y: 598 };
  const launch = launchStateFromPull(anchor, rawPull, 0);
  approx(t, magnitude(launch.pull), MAX_PULL);
  approx(t, magnitude({
    x: launch.origin.x - anchor.x,
    y: launch.origin.y - anchor.y
  }), RELEASE_CLEARANCE);
  t.end();
});

test("projectile helpers match analytical expectations", (t) => {
  const vy0 = -50;
  const duration = timeOfFlight(vy0, 10);
  approx(t, duration, 10);
  approx(t, timeToVerticalPosition(80, vy0, 80, 10), duration);

  const distance = range(100, -PI / 4, 10, 20);
  approx(t, distance, 3000);

  const height = maxHeight(vy0, 10);
  approx(t, height, 125);

  const impact = positionAt({ x: 5, y: 80 }, { x: 70, y: vy0 }, 10, 20, duration);
  approxPoint(t, impact, { x: 1705, y: 80 });
  t.end();
});

test("release and ground-contact metrics use the visible projectile path", (t) => {
  const anchor = { x: 196, y: GROUND_Y - 42 };
  const radius = 18;
  const launch = launchStateFromPull(anchor, { x: -100, y: 60 }, 0, radius);
  const groundTime = timeToVerticalPosition(launch.origin.y, launch.velocity.y, GROUND_Y - radius, GRAVITY);
  const impact = positionAt(launch.origin, launch.velocity, GRAVITY, 0, groundTime);

  t.deepEqual(releasePoint(anchor, { x: 0, y: 0 }), anchor);
  approx(t, launch.timeToGround, groundTime);
  approx(t, impact.y, GROUND_Y - radius);
  t.ok(launch.origin.x > anchor.x);
  t.ok(launch.origin.y < anchor.y);
  t.ok(launch.timeToGround > launch.timeOfFlight);
  t.ok(launch.groundRange > launch.range);
  t.end();
});

test("wrapAngle and exponential decay remain bounded and predictable", (t) => {
  approx(t, wrapAngle(-0.25), (2 * PI) - 0.25);
  approx(t, wrapAngle(9 * PI), PI);
  approx(t, applyExponentialDecay(10, 0.5, 2), 10 / E, 1e-9);
  t.end();
});

test("advanceBird bounces fast impacts and accumulates rest on soft landings", (t) => {
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
  approx(t, bouncingBird.y, GROUND_Y - bouncingBird.radius);
  t.ok(bouncingBird.vy < 0);
  t.equal(bouncingBird.restTimer, 0);
  t.ok(bouncingBird.spin >= 0 && bouncingBird.spin < 2 * PI);

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
  approx(t, restingBird.y, GROUND_Y - restingBird.radius);
  t.equal(restingBird.vy, 0);
  approx(t, restingBird.restTimer, 0.1);
  t.end();
});

test("advancePig applies gravity and handles ground collision with fall damage", (t) => {
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

  t.ok(fallingPig.y >= GROUND_Y - fallingPig.radius - 5);
  t.ok(fallingPig.y <= GROUND_Y - fallingPig.radius + 1);
  t.ok(fallingPig.health < 100);
  t.equal(fallingPig.grounded, true);
  t.end();
});

test("advancePig accumulates rest time when pig is stationary on ground", (t) => {
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
  approx(t, restingPig.restTimer, 0.1);
  t.equal(restingPig.grounded, true);
  t.end();
});

test("advancePig does not process dead pigs", (t) => {
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

  t.equal(deadPig.y, initialY);
  t.end();
});

test("advancePig applies gravity correctly over time", (t) => {
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

  advancePig(pig, dt);

  approx(t, pig.vy, GRAVITY * dt);

  t.ok(pig.y > initialY);
  t.end();
});

test("advancePig applies horizontal friction on ground", (t) => {
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

  for (let i = 0; i < 10; i++) {
    advancePig(pig, 0.02);
  }

  t.ok(pig.vx < initialVx);
  t.ok(pig.vx > 0);
  t.end();
});

test("advancePig kills pig when health drops to zero from fall damage", (t) => {
  const pig = {
    x: 100,
    y: 100,
    vx: 0,
    vy: 0,
    radius: 22,
    mass: 1.2,
    health: 30,
    alive: true,
    grounded: false,
    restTimer: 0
  };

  // Let it fall for a while to build up speed
  for (let i = 0; i < 100; i++) {
    advancePig(pig, 0.02);
    if (!pig.alive) break;
  }

  t.equal(pig.alive, false);
  t.ok(pig.health <= 0);
  t.end();
});

test("advancePig soft landing does not cause damage", (t) => {
  const pig = {
    x: 100,
    y: GROUND_Y - 30,
    vx: 0,
    vy: 40,
    radius: 22,
    mass: 1.2,
    health: 100,
    alive: true,
    grounded: false,
    restTimer: 0
  };

  advancePig(pig, 0.02);

  t.equal(pig.health, 100);
  t.equal(pig.alive, true);
  t.end();
});
