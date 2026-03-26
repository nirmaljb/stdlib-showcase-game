import test from "node:test";
import assert from "node:assert/strict";
import { angle, clampMagnitude, magnitude, normalize, reflect, rotate } from "../src/lib/vector.js";
import { approx, approxPoint } from "./helpers.js";
import PI from "@stdlib/constants-float64-pi";

test("normalize returns stable unit vectors and handles zero safely", () => {
  const unit = normalize({ x: 10, y: 0 });
  approx(unit.x, 1);
  approx(unit.y, 0);

  const zero = normalize({ x: 0, y: 0 });
  approxPoint(zero, { x: 0, y: 0 });
});

test("angle and rotate preserve expected orientation", () => {
  approx(angle({ x: 0, y: 1 }), PI / 2, 1e-9);

  const rotated = rotate({ x: 10, y: 0 }, PI / 2);
  approx(rotated.x, 0, 1e-9);
  approx(rotated.y, 10, 1e-9);
});

test("clampMagnitude preserves short vectors and limits long ones", () => {
  const unchanged = clampMagnitude({ x: 3, y: 4 }, 5);
  approxPoint(unchanged, { x: 3, y: 4 });

  const clamped = clampMagnitude({ x: 3, y: 4 }, 4);
  approx(magnitude(clamped), 4);
  approx(clamped.x / clamped.y, 3 / 4);
});

test("reflect mirrors the component along the collision normal", () => {
  const reflected = reflect({ x: 12, y: 8 }, { x: 0, y: -1 }, 1);
  approxPoint(reflected, { x: 12, y: -8 });
});
