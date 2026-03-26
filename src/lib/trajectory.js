import min from "@stdlib/math-base-special-min/lib/index.js";
import {
  GROUND_Y,
  GRAVITY,
  MIN_PULL,
  launchStateFromPull,
  positionAt
} from "./physics.js";

const PREVIEW_STEPS = 72;

export function computeTrajectory(anchor, pull, wind, bounds, radius = 18) {
  const launch = launchStateFromPull(anchor, pull, wind, radius);

  if (launch.speed < MIN_PULL * 2.2) {
    return {
      points: [],
      metrics: launch
    };
  }

  const maxDuration = min(launch.timeToGround || 2.6, 2.8);
  const groundContactY = GROUND_Y - radius;
  const points = [];

  for (let index = 0; index < PREVIEW_STEPS; index += 1) {
    const t = (index / (PREVIEW_STEPS - 1)) * maxDuration;
    const point = positionAt(launch.origin, launch.velocity, GRAVITY, wind, t);
    points.push(point);

    if (point.y >= groundContactY || point.x > bounds.width + 24 || point.x < -24) {
      break;
    }
  }

  return {
    points,
    metrics: launch
  };
}
