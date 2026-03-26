import test from "node:test";
import assert from "node:assert/strict";
import { circleCircleContact, circleRectContact, impactSpeed, isApproaching } from "../src/lib/collision.js";
import { approx, approxPoint } from "./helpers.js";

test("circle-circle contact resolves overlap and coincident centers", () => {
  const contact = circleCircleContact(
    { x: 40, y: 40, radius: 20 },
    { x: 66, y: 40, radius: 20 }
  );
  assert.ok(contact);
  approxPoint(contact.normal, { x: -1, y: 0 });
  approx(contact.overlap, 14);

  const coincident = circleCircleContact(
    { x: 10, y: 10, radius: 12 },
    { x: 10, y: 10, radius: 8 }
  );
  assert.ok(coincident);
  assert.deepEqual(coincident.normal, { x: 0, y: -1 });
  approx(coincident.overlap, 20);

  assert.equal(
    circleCircleContact(
      { x: 0, y: 0, radius: 10 },
      { x: 20, y: 0, radius: 10 }
    ),
    null
  );
});

test("circle-rect contact handles edge collisions and interior fallback normals", () => {
  const edgeHit = circleRectContact(
    { x: 50, y: 50, radius: 14 },
    { x: 70, y: 50, w: 20, h: 80 }
  );
  assert.ok(edgeHit);
  approxPoint(edgeHit.normal, { x: -1, y: 0 });
  approx(edgeHit.overlap, 4);

  const insideHit = circleRectContact(
    { x: 58, y: 50, radius: 14 },
    { x: 50, y: 50, w: 20, h: 80 }
  );
  assert.ok(insideHit);
  assert.deepEqual(insideHit.normal, { x: 1, y: 0 });
  approx(insideHit.overlap, 16);

  assert.equal(
    circleRectContact(
      { x: 20, y: 50, radius: 10 },
      { x: 40, y: 50, w: 20, h: 20 }
    ),
    null
  );
});

test("approach checks and impact speed follow the collision normal contract", () => {
  const normal = { x: -1, y: 0 };
  assert.equal(isApproaching({ x: 20, y: -5 }, normal), true);
  assert.equal(isApproaching({ x: -20, y: 5 }, normal), false);
  approx(impactSpeed({ x: 20, y: -5 }, normal), 20);
});
