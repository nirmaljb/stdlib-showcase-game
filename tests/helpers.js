import assert from "node:assert/strict";
import abs from "@stdlib/math-base-special-abs"

export function approx(actual, expected, tolerance = 1e-6) {
  assert.ok(
    abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

export function approxPoint(actual, expected, tolerance = 1e-6) {
  approx(actual.x, expected.x, tolerance);
  approx(actual.y, expected.y, tolerance);
}
