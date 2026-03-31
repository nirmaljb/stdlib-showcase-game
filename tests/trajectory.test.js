import test from "tape";
import { GROUND_Y } from "../src/lib/physics.js";
import { computeTrajectory } from "../src/lib/trajectory.js";
import { approxPoint } from "./helpers.js";

test("computeTrajectory suppresses the preview for very weak pulls", (t) => {
  const trajectory = computeTrajectory(
    { x: 196, y: GROUND_Y - 42 },
    { x: -5, y: 0 },
    0,
    { width: 1280 }
  );

  t.deepEqual(trajectory.points, []);
  t.ok(trajectory.metrics.speed > 0);
  t.end();
});

test("computeTrajectory samples from the release point until a stopping bound is hit", (t) => {
  const trajectory = computeTrajectory(
    { x: 196, y: GROUND_Y - 42 },
    { x: -100, y: 60 },
    0,
    { width: 900 }
  );

  t.ok(trajectory.points.length > 10);
  t.ok(trajectory.points.length <= 72);
  approxPoint(t, trajectory.points[0], trajectory.metrics.origin);

  for (let index = 1; index < trajectory.points.length; index += 1) {
    t.ok(trajectory.points[index].x >= trajectory.points[index - 1].x);
  }

  const lastPoint = trajectory.points.at(-1);
  t.ok(lastPoint.y >= GROUND_Y - 18 || lastPoint.x > 924 || lastPoint.x < -24);
  t.end();
});
