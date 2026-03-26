import abs from "@stdlib/math-base-special-abs/lib/index.js";
import clamp from "@stdlib/math-base-special-clamp/lib/index.js";
import hypot from "@stdlib/math-base-special-hypot/lib/index.js";
import { EPSILON, dot } from "./vector.js";

export function circleCircleContact(mover, target) {
  const dx = mover.x - target.x;
  const dy = mover.y - target.y;
  const distance = hypot(dx, dy);
  const overlap = mover.radius + target.radius - distance;

  if (overlap <= 0) {
    return null;
  }

  if (distance <= EPSILON) {
    return {
      normal: { x: 0, y: -1 },
      overlap: mover.radius + target.radius
    };
  }

  return {
    normal: { x: dx / distance, y: dy / distance },
    overlap
  };
}

export function circleRectContact(circle, rect) {
  const left = rect.x - rect.w / 2;
  const right = rect.x + rect.w / 2;
  const top = rect.y - rect.h / 2;
  const bottom = rect.y + rect.h / 2;
  const nearestX = clamp(circle.x, left, right);
  const nearestY = clamp(circle.y, top, bottom);
  const dx = circle.x - nearestX;
  const dy = circle.y - nearestY;
  const distance = hypot(dx, dy);

  if (distance >= circle.radius) {
    return null;
  }

  if (distance <= EPSILON) {
    const offsetX = circle.x - rect.x;
    const offsetY = circle.y - rect.y;
    const overlapX = rect.w / 2 + circle.radius - abs(offsetX);
    const overlapY = rect.h / 2 + circle.radius - abs(offsetY);

    if (overlapX < overlapY) {
      return {
        normal: { x: offsetX < 0 ? -1 : 1, y: 0 },
        overlap: overlapX
      };
    }

    return {
      normal: { x: 0, y: offsetY < 0 ? -1 : 1 },
      overlap: overlapY
    };
  }

  return {
    normal: { x: dx / distance, y: dy / distance },
    overlap: circle.radius - distance
  };
}

export function isApproaching(velocity, normal) {
  return dot(velocity, normal) < -EPSILON;
}

export function impactSpeed(velocity, normal) {
  return abs(dot(velocity, normal));
}
