import abs from "@stdlib/math-base-special-abs/lib/index.js";
import exp from "@stdlib/math-base-special-exp/lib/index.js";
import max from "@stdlib/math-base-special-max/lib/index.js";
import min from "@stdlib/math-base-special-min/lib/index.js";
import pow from "@stdlib/math-base-special-pow/lib/index.js";
import sqrt from "@stdlib/math-base-special-sqrt/lib/index.js";
import PI from "@stdlib/constants-float64-pi/lib/index.js";
import TWO_PI from "@stdlib/constants-float64-two-pi/lib/index.js";
import sin from "@stdlib/math-base-special-sin/lib/index.js";
import cos from "@stdlib/math-base-special-cos/lib/index.js";
import { angle, clampMagnitude, magnitude, normalize, scale, add } from "./vector.js";

export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 720;
export const GROUND_HEIGHT = 92;
export const GROUND_Y = WORLD_HEIGHT - GROUND_HEIGHT;
export const FIXED_DT = 1 / 120;
export const GRAVITY = 620;
export const MAX_PULL = 118;
export const MIN_PULL = 14;
export const SPEED_SCALE = 4.9;
export const MAX_LAUNCH_SPEED = 760;
export const RELEASE_CLEARANCE = 18;

export function clampPull(pull) {
  return clampMagnitude(pull, MAX_PULL);
}

export function launchAngleFromPull(pull) {
  return angle(pull) + PI;
}

export function launchSpeedFromPull(pull) {
  return min(magnitude(pull) * SPEED_SCALE, MAX_LAUNCH_SPEED);
}

export function decomposeVelocity(speed, theta) {
  return {
    x: speed * cos(theta),
    y: speed * sin(theta)
  };
}

export function timeOfFlight(vy0, gravity = GRAVITY) {
  if (vy0 >= 0) {
    return 0;
  }
  return (-2 * vy0) / gravity;
}

export function timeToVerticalPosition(originY, vy0, targetY, gravity = GRAVITY) {
  const a = 0.5 * gravity;
  const b = vy0;
  const c = originY - targetY;
  const discriminant = max(pow(b, 2) - 4 * a * c, 0);
  const root = sqrt(discriminant);
  const t1 = (-b - root) / (2 * a);
  const t2 = (-b + root) / (2 * a);
  const candidate = max(t1, t2);
  return candidate > 0 ? candidate : 0;
}

export function range(speed, theta, gravity = GRAVITY, wind = 0) {
  const velocity = decomposeVelocity(speed, theta);
  const duration = timeOfFlight(velocity.y, gravity);
  return abs(velocity.x * duration + 0.5 * wind * pow(duration, 2));
}

export function maxHeight(vy0, gravity = GRAVITY) {
  if (vy0 >= 0) {
    return 0;
  }
  return abs(pow(vy0, 2) / (2 * gravity));
}

export function positionAt(origin, initialVelocity, gravity, wind, t) {
  return {
    x: origin.x + initialVelocity.x * t + 0.5 * wind * pow(t, 2),
    y: origin.y + initialVelocity.y * t + 0.5 * gravity * pow(t, 2)
  };
}

export function releasePoint(anchor, velocity, clearance = RELEASE_CLEARANCE) {
  if (magnitude(velocity) <= 1e-6) {
    return { ...anchor };
  }

  // Start the projectile slightly ahead of the pouch so it visibly exits the sling
  // instead of beginning from the dragged-back pose behind the frame.
  return add(anchor, scale(normalize(velocity), clearance));
}

export function launchStateFromPull(anchor, pull, wind = 0, radius = 18, groundY = GROUND_Y) {
  const clampedPull = clampPull(pull);
  const speed = launchSpeedFromPull(clampedPull);
  const theta = launchAngleFromPull(clampedPull);
  const velocity = decomposeVelocity(speed, theta);
  const origin = releasePoint(anchor, velocity);
  const returnTime = timeOfFlight(velocity.y, GRAVITY);
  const groundContactY = groundY - radius;
  const timeToGround = timeToVerticalPosition(origin.y, velocity.y, groundContactY, GRAVITY);
  const impact = positionAt(origin, velocity, GRAVITY, wind, timeToGround);

  return {
    anchor,
    origin,
    pull: clampedPull,
    speed,
    theta,
    velocity,
    timeOfFlight: returnTime,
    timeToGround,
    range: range(speed, theta, GRAVITY, wind),
    groundRange: abs(impact.x - anchor.x),
    maxHeight: maxHeight(velocity.y, GRAVITY),
    impact
  };
}

export function applyExponentialDecay(value, rate, dt) {
  return value * exp(-rate * dt);
}

export function wrapAngle(theta) {
  let wrapped = theta;
  while (wrapped < 0) {
    wrapped += TWO_PI;
  }
  while (wrapped >= TWO_PI) {
    wrapped -= TWO_PI;
  }
  return wrapped;
}

export function advanceBird(bird, dt, wind, groundY = GROUND_Y) {
  bird.vx += wind * dt;
  bird.vy += GRAVITY * dt;
  bird.x += bird.vx * dt;
  bird.y += bird.vy * dt;
  bird.spin = wrapAngle(bird.spin + (bird.vx / max(bird.radius, 1)) * dt);

  const grounded = bird.y + bird.radius >= groundY;
  if (grounded) {
    bird.y = groundY - bird.radius;

    if (abs(bird.vy) < 72) {
      bird.vy = 0;
    } else {
      bird.vy *= -0.32;
    }

    bird.vx = applyExponentialDecay(bird.vx, 2.2, dt) * 0.92;
  }

  if (grounded && magnitude({ x: bird.vx, y: bird.vy }) < 24) {
    bird.restTimer += dt;
  } else {
    bird.restTimer = 0;
  }
}
