import test from "node:test";
import assert from "node:assert/strict";
import {
  comboMultiplier,
  createScoreState,
  impactForce,
  registerBonus,
  registerImpact,
  tickScoreState
} from "../src/lib/score.js";
import { approx } from "./helpers.js";

test("comboMultiplier starts at one and caps at the configured maximum", () => {
  approx(comboMultiplier(0), 1);
  approx(comboMultiplier(1), 1);
  approx(comboMultiplier(2), 1.4);
  approx(comboMultiplier(6), 4.25);
});

test("impactForce uses only the velocity component along the normal", () => {
  approx(impactForce(2, { x: 3, y: 4 }, { x: 0, y: -1 }), 8);
});

test("registerImpact applies combo math, per-type scoring, and HUD state", () => {
  const score = createScoreState();

  const pigAward = registerImpact(score, 50, "pig");
  assert.equal(pigAward, 560);
  assert.equal(score.total, 560);
  assert.equal(score.combo, 1);
  assert.equal(score.banner, "Pig Popped");
  assert.equal(score.bannerTimer, 0.9);
  assert.equal(score.flash, 1);

  const blockAward = registerImpact(score, 100, "block");
  assert.equal(blockAward, 902);
  assert.equal(score.total, 1462);
  assert.equal(score.combo, 2);
  assert.equal(score.banner, "Block Cracked");
  assert.equal(score.lastAward, 902);
});

test("tickScoreState decays transient UI state and clears expired combos", () => {
  const score = createScoreState();
  registerImpact(score, 40, "pig");
  registerImpact(score, 40, "block");

  tickScoreState(score, 0.5);
  assert.equal(score.combo, 2);
  assert.ok(score.flash < 1);
  approx(score.bannerTimer, 0.4);

  tickScoreState(score, 0.7);
  assert.equal(score.combo, 0);
  assert.equal(score.comboTimer, 0);
  assert.equal(score.bannerTimer, 0);
});

test("registerBonus floors awards and updates the banner state", () => {
  const score = createScoreState();
  const award = registerBonus(score, "Last Bird", 999.8);

  assert.equal(award, 999);
  assert.equal(score.total, 999);
  assert.equal(score.lastAward, 999);
  assert.equal(score.banner, "Last Bird");
  approx(score.bannerTimer, 1.3);
});
