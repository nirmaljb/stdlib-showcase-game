import test from "tape";
import { circleCircleContact, circleRectContact, impactSpeed, isApproaching, isRestingOnBlock, findSupportBlock, getSlidingDirection, pigBlockContact } from "../src/lib/collision.js";
import { approx, approxPoint } from "./helpers.js";

test("circle-circle contact resolves overlap and coincident centers", (t) => {
  const contact = circleCircleContact(
    { x: 40, y: 40, radius: 20 },
    { x: 66, y: 40, radius: 20 }
  );
  t.ok(contact);
  approxPoint(t, contact.normal, { x: -1, y: 0 });
  approx(t, contact.overlap, 14);

  const coincident = circleCircleContact(
    { x: 10, y: 10, radius: 12 },
    { x: 10, y: 10, radius: 8 }
  );
  t.ok(coincident);
  t.deepEqual(coincident.normal, { x: 0, y: -1 });
  approx(t, coincident.overlap, 20);

  t.equal(
    circleCircleContact(
      { x: 0, y: 0, radius: 10 },
      { x: 20, y: 0, radius: 10 }
    ),
    null
  );
  t.end();
});

test("circle-rect contact handles edge collisions and interior fallback normals", (t) => {
  const edgeHit = circleRectContact(
    { x: 50, y: 50, radius: 14 },
    { x: 70, y: 50, w: 20, h: 80 }
  );
  t.ok(edgeHit);
  approxPoint(t, edgeHit.normal, { x: -1, y: 0 });
  approx(t, edgeHit.overlap, 4);

  const insideHit = circleRectContact(
    { x: 58, y: 50, radius: 14 },
    { x: 50, y: 50, w: 20, h: 80 }
  );
  t.ok(insideHit);
  t.deepEqual(insideHit.normal, { x: 1, y: 0 });
  approx(t, insideHit.overlap, 16);

  t.equal(
    circleRectContact(
      { x: 20, y: 50, radius: 10 },
      { x: 40, y: 50, w: 20, h: 20 }
    ),
    null
  );
  t.end();
});

test("approach checks and impact speed follow the collision normal contract", (t) => {
  const normal = { x: -1, y: 0 };
  t.equal(isApproaching({ x: 20, y: -5 }, normal), true);
  t.equal(isApproaching({ x: -20, y: 5 }, normal), false);
  approx(t, impactSpeed({ x: 20, y: -5 }, normal), 20);
  t.end();
});

test("isRestingOnBlock detects when a pig rests on top of a block", (t) => {
  const block = { x: 100, y: 500, w: 60, h: 40 }; // top at y=480
  const pigRadius = 20;

  const restingPig = { x: 100, y: 480 - pigRadius, radius: pigRadius };
  t.equal(isRestingOnBlock(restingPig, block), true);

  const highPig = { x: 100, y: 440, radius: pigRadius };
  t.equal(isRestingOnBlock(highPig, block), false);

  const farRightPig = { x: 180, y: 480 - pigRadius, radius: pigRadius };
  t.equal(isRestingOnBlock(farRightPig, block), false);

  const offsetPig = { x: 120, y: 480 - pigRadius, radius: pigRadius };
  t.equal(isRestingOnBlock(offsetPig, block), true);
  t.end();
});

test("findSupportBlock returns the correct supporting block", (t) => {
  const blocks = [
    { x: 100, y: 500, w: 60, h: 40, alive: true },
    { x: 200, y: 500, w: 60, h: 40, alive: true },
    { x: 300, y: 500, w: 60, h: 40, alive: false }
  ];
  const pigRadius = 20;

  const pig1 = { x: 100, y: 480 - pigRadius, radius: pigRadius };
  t.equal(findSupportBlock(pig1, blocks), blocks[0]);

  const pig2 = { x: 200, y: 480 - pigRadius, radius: pigRadius };
  t.equal(findSupportBlock(pig2, blocks), blocks[1]);

  const pig3 = { x: 300, y: 480 - pigRadius, radius: pigRadius };
  t.equal(findSupportBlock(pig3, blocks), null);

  const pig4 = { x: 400, y: 480 - pigRadius, radius: pigRadius };
  t.equal(findSupportBlock(pig4, blocks), null);
  t.end();
});

test("getSlidingDirection detects when pig should slide off block edge", (t) => {
  const block = { x: 100, y: 500, w: 60, h: 40, alive: true };
  const pigRadius = 20;

  const centeredPig = { x: 100, y: 458, radius: pigRadius };
  t.equal(getSlidingDirection(centeredPig, block), 0);

  const rightPig = { x: 130, y: 458, radius: pigRadius };
  t.equal(getSlidingDirection(rightPig, block), 1);

  const leftPig = { x: 70, y: 458, radius: pigRadius };
  t.equal(getSlidingDirection(leftPig, block), -1);

  t.equal(getSlidingDirection(centeredPig, null), 0);
  t.end();
});

test("pigBlockContact detects collision between falling pig and block", (t) => {
  const block = { x: 100, y: 500, w: 60, h: 40 };
  const pigRadius = 20;

  const fallingPig = { x: 100, y: 470, radius: pigRadius };
  const contact = pigBlockContact(fallingPig, block);
  t.ok(contact);
  t.ok(contact.normal.y < 0);
  t.ok(contact.overlap > 0);

  const farPig = { x: 100, y: 400, radius: pigRadius };
  t.equal(pigBlockContact(farPig, block), null);
  t.end();
});

test("pigBlockContact calculates correct overlap for vertical collision", (t) => {
  const block = { x: 100, y: 500, w: 60, h: 40 };
  const pigRadius = 20;

  const pig = { x: 100, y: 465, radius: pigRadius };
  const contact = pigBlockContact(pig, block);

  t.ok(contact);
  approx(t, contact.overlap, 5);
  approx(t, contact.normal.y, -1);
  t.end();
});

test("pigBlockContact handles side collisions correctly", (t) => {
  const block = { x: 100, y: 500, w: 60, h: 40 };
  const pigRadius = 20;

  const leftPig = { x: 55, y: 500, radius: pigRadius };
  const leftContact = pigBlockContact(leftPig, block);

  t.ok(leftContact);
  t.ok(leftContact.normal.x < 0);

  const rightPig = { x: 145, y: 500, radius: pigRadius };
  const rightContact = pigBlockContact(rightPig, block);

  t.ok(rightContact);
  t.ok(rightContact.normal.x > 0);
  t.end();
});

test("isRestingOnBlock uses correct tolerance for vertical alignment", (t) => {
  const block = { x: 100, y: 500, w: 60, h: 40 };
  const pigRadius = 20;

  const exactPig = { x: 100, y: 480 - pigRadius, radius: pigRadius };
  t.equal(isRestingOnBlock(exactPig, block), true);

  const slightlyLowPig = { x: 100, y: 480 - pigRadius + 3, radius: pigRadius };
  t.equal(isRestingOnBlock(slightlyLowPig, block), true);

  const tooLowPig = { x: 100, y: 480 - pigRadius + 6, radius: pigRadius };
  t.equal(isRestingOnBlock(tooLowPig, block), false);
  t.end();
});

test("getSlidingDirection respects the 65% threshold", (t) => {
  const block = { x: 100, y: 500, w: 100, h: 40, alive: true };
  const pigRadius = 20;
  const threshold = 50 * 0.65;

  const atThreshold = { x: 100 + 32, y: 458, radius: pigRadius };
  t.equal(getSlidingDirection(atThreshold, block), 0);

  const pastThreshold = { x: 100 + 34, y: 458, radius: pigRadius };
  t.equal(getSlidingDirection(pastThreshold, block), 1);
  t.ok(threshold > 32 && threshold < 34);
  t.end();
});
