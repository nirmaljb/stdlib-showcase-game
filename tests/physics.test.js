import test from "node:test";
import assert from "node:assert/strict";
import {
  GROUND_Y,
  GRAVITY,
  MAX_LAUNCH_SPEED,
  MAX_PULL,
  RELEASE_CLEARANCE,
  advanceBird,
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
