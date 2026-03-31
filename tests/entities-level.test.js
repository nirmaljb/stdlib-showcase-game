import test from "tape";
import { createBird, createBlock, createPig } from "../src/lib/entities.js";
import { LEVELS, createLevel } from "../src/lib/level.js";
import isInteger from "@stdlib/assert-is-integer";

test("entity factories apply expected defaults and overrides", (t) => {
  const anchor = { x: 196, y: 598 };
  const bird = createBird(anchor);
  t.equal(bird.kind, "bird");
  t.equal(bird.type, "red");
  t.equal(bird.x, anchor.x);
  t.equal(bird.y, anchor.y);
  t.equal(bird.radius, 18);
  t.equal(bird.mass, 1.8);
  t.deepEqual(bird.trail, []);

  const defaultPig = createPig({ x: 620, y: 540 });
  t.equal(defaultPig.radius, 22);
  t.equal(defaultPig.health, 120);
  t.equal(defaultPig.maxHealth, 120);
  t.equal(defaultPig.alive, true);

  const customPig = createPig({ x: 620, y: 540, radius: 30, health: 40 });
  t.equal(customPig.radius, 30);
  t.equal(customPig.health, 40);
  t.equal(customPig.maxHealth, 40);
  t.end();
});

test("blocks derive health from their footprint unless overridden", (t) => {
  const derived = createBlock({ x: 700, y: 520, w: 100, h: 16 });
  t.equal(derived.maxHealth, 230);
  t.equal(derived.health, 230);
  t.equal(derived.alive, true);

  const custom = createBlock({ x: 700, y: 520, w: 100, h: 16, health: 90 });
  t.equal(custom.maxHealth, 90);
  t.equal(custom.health, 90);
  t.end();
});

test("createLevel cycles definitions and instantiates fresh entity state", (t) => {
  const level = createLevel(LEVELS.length);
  t.equal(level.name, LEVELS[0].name);
  t.equal(level.subtitle, LEVELS[0].subtitle);
  t.equal(level.birds, LEVELS[0].birds);
  t.equal(level.pigs.length, LEVELS[0].pigs.length);
  t.equal(level.blocks.length, LEVELS[0].blocks.length);
  t.ok(isInteger(level.wind));
  t.ok(level.wind >= -65 && level.wind <= 65);
  t.notEqual(level.pigs[0], LEVELS[0].pigs[0]);
  t.notEqual(level.blocks[0], LEVELS[0].blocks[0]);
  t.equal(level.pigs[0].kind, "pig");
  t.equal(level.blocks[0].kind, "block");
  t.end();
});
