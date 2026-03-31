import abs from "@stdlib/math-base-special-abs";

export function approx(t, actual, expected, tolerance = 1e-6, message) {
  t.ok(
    abs(actual - expected) <= tolerance,
    message ?? `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

export function approxPoint(t, actual, expected, tolerance = 1e-6, message = "points should match") {
  approx(t, actual.x, expected.x, tolerance, `${message} (x)`);
  approx(t, actual.y, expected.y, tolerance, `${message} (y)`);
}
