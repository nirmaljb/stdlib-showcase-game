import test from "node:test";
import assert from "node:assert/strict";
import { circleCircleContact, circleRectContact, impactSpeed, isApproaching, isRestingOnBlock, findSupportBlock, getSlidingDirection, pigBlockContact } from "../src/lib/collision.js";
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

test("isRestingOnBlock detects when a pig rests on top of a block", () => {
  const block = { x: 100, y: 500, w: 60, h: 40 }; // top at y=480
  const pigRadius = 20;

  // Pig resting on top of block
  const restingPig = { x: 100, y: 480 - pigRadius, radius: pigRadius };
  assert.equal(isRestingOnBlock(restingPig, block), true);

  // Pig too high above block
  const highPig = { x: 100, y: 440, radius: pigRadius };
  assert.equal(isRestingOnBlock(highPig, block), false);

  // Pig too far to the right
  const farRightPig = { x: 180, y: 480 - pigRadius, radius: pigRadius };
  assert.equal(isRestingOnBlock(farRightPig, block), false);

  // Pig slightly off center but still within bounds
  const offsetPig = { x: 120, y: 480 - pigRadius, radius: pigRadius };
  assert.equal(isRestingOnBlock(offsetPig, block), true);
});

test("findSupportBlock returns the correct supporting block", () => {
  const blocks = [
    { x: 100, y: 500, w: 60, h: 40, alive: true },
    { x: 200, y: 500, w: 60, h: 40, alive: true },
    { x: 300, y: 500, w: 60, h: 40, alive: false } // dead block
  ];
  const pigRadius = 20;

  // Pig on first block
  const pig1 = { x: 100, y: 480 - pigRadius, radius: pigRadius };
  assert.equal(findSupportBlock(pig1, blocks), blocks[0]);

  // Pig on second block
  const pig2 = { x: 200, y: 480 - pigRadius, radius: pigRadius };
  assert.equal(findSupportBlock(pig2, blocks), blocks[1]);

  // Pig on dead block - should not find support
  const pig3 = { x: 300, y: 480 - pigRadius, radius: pigRadius };
  assert.equal(findSupportBlock(pig3, blocks), null);

  // Pig not on any block
  const pig4 = { x: 400, y: 480 - pigRadius, radius: pigRadius };
  assert.equal(findSupportBlock(pig4, blocks), null);
});

test("getSlidingDirection detects when pig should slide off block edge", () => {
  const block = { x: 100, y: 500, w: 60, h: 40, alive: true };
  const pigRadius = 20;

  // Pig centered - no slide
  const centeredPig = { x: 100, y: 458, radius: pigRadius };
  assert.equal(getSlidingDirection(centeredPig, block), 0);

  // Pig far to the right edge - should slide right
  const rightPig = { x: 130, y: 458, radius: pigRadius };
  assert.equal(getSlidingDirection(rightPig, block), 1);

  // Pig far to the left edge - should slide left
  const leftPig = { x: 70, y: 458, radius: pigRadius };
  assert.equal(getSlidingDirection(leftPig, block), -1);

  // Dead block - no slide
  assert.equal(getSlidingDirection(centeredPig, null), 0);
});

test("pigBlockContact detects collision between falling pig and block", () => {
  const block = { x: 100, y: 500, w: 60, h: 40 };
  const pigRadius = 20;

  // Pig colliding from above
  const fallingPig = { x: 100, y: 470, radius: pigRadius };
  const contact = pigBlockContact(fallingPig, block);
  assert.ok(contact);
  assert.ok(contact.normal.y < 0); // Normal points up
  assert.ok(contact.overlap > 0);

  // Pig not touching block
  const farPig = { x: 100, y: 400, radius: pigRadius };
  assert.equal(pigBlockContact(farPig, block), null);
});

test("pigBlockContact calculates correct overlap for vertical collision", () => {
  const block = { x: 100, y: 500, w: 60, h: 40 }; // top at y=480
  const pigRadius = 20;

  // Pig overlapping 5 pixels into block from above
  const pig = { x: 100, y: 465, radius: pigRadius }; // bottom at 485, block top at 480
  const contact = pigBlockContact(pig, block);

  assert.ok(contact);
  // Overlap should be radius - distance to nearest point
  // Nearest point on block is (100, 480), distance is 15, overlap = 20 - 15 = 5
  approx(contact.overlap, 5);
  // Normal should point upward (from block toward pig)
  approx(contact.normal.y, -1);
});

test("pigBlockContact handles side collisions correctly", () => {
  const block = { x: 100, y: 500, w: 60, h: 40 };
  const pigRadius = 20;

  // Pig hitting from the left side
  const leftPig = { x: 55, y: 500, radius: pigRadius }; // block left edge at x=70
  const leftContact = pigBlockContact(leftPig, block);

  assert.ok(leftContact);
  assert.ok(leftContact.normal.x < 0); // Normal points left

  // Pig hitting from the right side
  const rightPig = { x: 145, y: 500, radius: pigRadius }; // block right edge at x=130
  const rightContact = pigBlockContact(rightPig, block);

  assert.ok(rightContact);
  assert.ok(rightContact.normal.x > 0); // Normal points right
});

test("isRestingOnBlock uses correct tolerance for vertical alignment", () => {
  const block = { x: 100, y: 500, w: 60, h: 40 }; // top at y=480
  const pigRadius = 20;

  // Pig exactly at rest position (bottom at block top)
  const exactPig = { x: 100, y: 480 - pigRadius, radius: pigRadius };
  assert.equal(isRestingOnBlock(exactPig, block), true);

  // Pig slightly below (within tolerance of 4)
  const slightlyLowPig = { x: 100, y: 480 - pigRadius + 3, radius: pigRadius };
  assert.equal(isRestingOnBlock(slightlyLowPig, block), true);

  // Pig too far below (outside tolerance)
  const tooLowPig = { x: 100, y: 480 - pigRadius + 6, radius: pigRadius };
  assert.equal(isRestingOnBlock(tooLowPig, block), false);
});

test("getSlidingDirection respects the 65% threshold", () => {
  const block = { x: 100, y: 500, w: 100, h: 40, alive: true }; // halfWidth = 50
  const pigRadius = 20;
  const threshold = 50 * 0.65; // 32.5 pixels from center

  // Pig at exactly threshold - should not slide
  const atThreshold = { x: 100 + 32, y: 458, radius: pigRadius };
  assert.equal(getSlidingDirection(atThreshold, block), 0);

  // Pig just past threshold - should slide
  const pastThreshold = { x: 100 + 34, y: 458, radius: pigRadius };
  assert.equal(getSlidingDirection(pastThreshold, block), 1);
});
