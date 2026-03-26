import test from "node:test";
import assert from "node:assert/strict";
import { createBird, createBlock, createPig } from "../src/lib/entities.js";
import { LEVELS, createLevel } from "../src/lib/level.js";
import isInteger from "@stdlib/assert-is-integer";

test("entity factories apply expected defaults and overrides", () => {
  const anchor = { x: 196, y: 598 };
  const bird = createBird(anchor);
  assert.equal(bird.kind, "bird");
  assert.equal(bird.type, "red");
  assert.equal(bird.x, anchor.x);
  assert.equal(bird.y, anchor.y);
  assert.equal(bird.radius, 18);
  assert.equal(bird.mass, 1.8);
  assert.deepEqual(bird.trail, []);

  const defaultPig = createPig({ x: 620, y: 540 });
  assert.equal(defaultPig.radius, 22);
  assert.equal(defaultPig.health, 120);
  assert.equal(defaultPig.maxHealth, 120);
  assert.equal(defaultPig.alive, true);

  const customPig = createPig({ x: 620, y: 540, radius: 30, health: 40 });
  assert.equal(customPig.radius, 30);
  assert.equal(customPig.health, 40);
  assert.equal(customPig.maxHealth, 40);
});

test("blocks derive health from their footprint unless overridden", () => {
  const derived = createBlock({ x: 700, y: 520, w: 100, h: 16 });
  assert.equal(derived.maxHealth, 230);
  assert.equal(derived.health, 230);
  assert.equal(derived.alive, true);

  const custom = createBlock({ x: 700, y: 520, w: 100, h: 16, health: 90 });
  assert.equal(custom.maxHealth, 90);
  assert.equal(custom.health, 90);
});

test("createLevel cycles definitions and instantiates fresh entity state", () => {
  const level = createLevel(LEVELS.length);
  assert.equal(level.name, LEVELS[0].name);
  assert.equal(level.subtitle, LEVELS[0].subtitle);
  assert.equal(level.birds, LEVELS[0].birds);
  assert.equal(level.pigs.length, LEVELS[0].pigs.length);
  assert.equal(level.blocks.length, LEVELS[0].blocks.length);
  assert.ok(isInteger(level.wind));
  assert.ok(level.wind >= -65 && level.wind <= 65);
  assert.notEqual(level.pigs[0], LEVELS[0].pigs[0]);
  assert.notEqual(level.blocks[0], LEVELS[0].blocks[0]);
  assert.equal(level.pigs[0].kind, "pig");
  assert.equal(level.blocks[0].kind, "block");
});
