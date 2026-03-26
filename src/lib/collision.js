import abs from "@stdlib/math-base-special-abs/lib/index.js";
import clamp from "@stdlib/math-base-special-clamp/lib/index.js";
import hypot from "@stdlib/math-base-special-hypot/lib/index.js";
import max from "@stdlib/math-base-special-max/lib/index.js";
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

/**
 * Check if a circle (pig) is resting on top of a rectangle (block).
 * Returns true if the pig's bottom is within tolerance of the block's top
 * and the pig is horizontally within the block's width.
 */
export function isRestingOnBlock(circle, rect, tolerance = 4) {
  const blockLeft = rect.x - rect.w / 2;
  const blockRight = rect.x + rect.w / 2;
  const blockTop = rect.y - rect.h / 2;

  // Pig's bottom position
  const pigBottom = circle.y + circle.radius;

  // Check vertical alignment: pig bottom should be close to block top
  const verticallyAligned = abs(pigBottom - blockTop) <= tolerance;

  // Check horizontal overlap: pig center should be within block bounds (with some margin)
  const horizontalOverlap = circle.x >= blockLeft - circle.radius * 0.3 &&
                            circle.x <= blockRight + circle.radius * 0.3;

  return verticallyAligned && horizontalOverlap;
}

/**
 * Find the block that a pig is currently resting on.
 * Returns the block or null if the pig is not resting on any block.
 */
export function findSupportBlock(pig, blocks) {
  for (const block of blocks) {
    if (!block.alive) {
      continue;
    }
    if (isRestingOnBlock(pig, block)) {
      return block;
    }
  }
  return null;
}

/**
 * Check if a pig resting on a block should slide off.
 * Returns a slide direction (-1 for left, 1 for right, 0 for no slide).
 */
export function getSlidingDirection(pig, block) {
  if (!block || !block.alive) {
    return 0;
  }

  const blockLeft = block.x - block.w / 2;
  const blockRight = block.x + block.w / 2;

  // Calculate how much of the pig is over the block
  const pigLeft = pig.x - pig.radius;
  const pigRight = pig.x + pig.radius;

  const overlapLeft = max(0, blockRight - pigLeft);
  const overlapRight = max(0, pigRight - blockLeft);
  const totalOverlap = overlapLeft + overlapRight - (pigRight - pigLeft);

  // Calculate center of mass relative to block
  const pigCenterOffset = pig.x - block.x;
  const halfBlockWidth = block.w / 2;

  // If pig's center is significantly off the edge, it should slide
  const slideThreshold = halfBlockWidth * 0.65;

  if (pigCenterOffset > slideThreshold) {
    return 1; // Slide right
  } else if (pigCenterOffset < -slideThreshold) {
    return -1; // Slide left
  }

  return 0;
}

/**
 * Resolve collision between a falling pig and a block.
 * Returns contact info if collision occurred.
 */
export function pigBlockContact(pig, block) {
  const left = block.x - block.w / 2;
  const right = block.x + block.w / 2;
  const top = block.y - block.h / 2;
  const bottom = block.y + block.h / 2;

  const nearestX = clamp(pig.x, left, right);
  const nearestY = clamp(pig.y, top, bottom);
  const dx = pig.x - nearestX;
  const dy = pig.y - nearestY;
  const distance = hypot(dx, dy);

  if (distance >= pig.radius) {
    return null;
  }

  if (distance <= EPSILON) {
    const offsetX = pig.x - block.x;
    const offsetY = pig.y - block.y;
    const overlapX = block.w / 2 + pig.radius - abs(offsetX);
    const overlapY = block.h / 2 + pig.radius - abs(offsetY);

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
    overlap: pig.radius - distance
  };
}
