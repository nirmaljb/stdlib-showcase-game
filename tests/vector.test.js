import test from "tape";
import { angle, clampMagnitude, magnitude, normalize, reflect, rotate } from "../src/lib/vector.js";
import { approx, approxPoint } from "./helpers.js";
import PI from "@stdlib/constants-float64-pi";

test("normalize returns stable unit vectors and handles zero safely", (t) => {
  const unit = normalize({ x: 10, y: 0 });
  approx(t, unit.x, 1);
  approx(t, unit.y, 0);

  const zero = normalize({ x: 0, y: 0 });
  approxPoint(t, zero, { x: 0, y: 0 });
  t.end();
});

test("angle and rotate preserve expected orientation", (t) => {
  approx(t, angle({ x: 0, y: 1 }), PI / 2, 1e-9);

  const rotated = rotate({ x: 10, y: 0 }, PI / 2);
  approx(t, rotated.x, 0, 1e-9);
  approx(t, rotated.y, 10, 1e-9);
  t.end();
});

test("clampMagnitude preserves short vectors and limits long ones", (t) => {
  const unchanged = clampMagnitude({ x: 3, y: 4 }, 5);
  approxPoint(t, unchanged, { x: 3, y: 4 });

  const clamped = clampMagnitude({ x: 3, y: 4 }, 4);
  approx(t, magnitude(clamped), 4);
  approx(t, clamped.x / clamped.y, 3 / 4);
  t.end();
});

test("reflect mirrors the component along the collision normal", (t) => {
  const reflected = reflect({ x: 12, y: 8 }, { x: 0, y: -1 }, 1);
  approxPoint(t, reflected, { x: 12, y: -8 });
  t.end();
});
