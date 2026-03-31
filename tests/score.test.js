import test from "tape";
import {
  comboMultiplier,
  createScoreState,
  impactForce,
  registerBonus,
  registerImpact,
  tickScoreState
} from "../src/lib/score.js";
import { approx } from "./helpers.js";

test("comboMultiplier starts at one and caps at the configured maximum", (t) => {
  approx(t, comboMultiplier(0), 1);
  approx(t, comboMultiplier(1), 1);
  approx(t, comboMultiplier(2), 1.4);
  approx(t, comboMultiplier(6), 4.25);
  t.end();
});

test("impactForce uses only the velocity component along the normal", (t) => {
  approx(t, impactForce(2, { x: 3, y: 4 }, { x: 0, y: -1 }), 8);
  t.end();
});

test("registerImpact applies combo math, per-type scoring, and HUD state", (t) => {
  const score = createScoreState();

  const pigAward = registerImpact(score, 50, "pig");
  t.equal(pigAward, 560);
  t.equal(score.total, 560);
  t.equal(score.combo, 1);
  t.equal(score.banner, "Pig Popped");
  t.equal(score.bannerTimer, 0.9);
  t.equal(score.flash, 1);

  const blockAward = registerImpact(score, 100, "block");
  t.equal(blockAward, 902);
  t.equal(score.total, 1462);
  t.equal(score.combo, 2);
  t.equal(score.banner, "Block Cracked");
  t.equal(score.lastAward, 902);
  t.end();
});

test("tickScoreState decays transient UI state and clears expired combos", (t) => {
  const score = createScoreState();
  registerImpact(score, 40, "pig");
  registerImpact(score, 40, "block");

  tickScoreState(score, 0.5);
  t.equal(score.combo, 2);
  t.ok(score.flash < 1);
  approx(t, score.bannerTimer, 0.4);

  tickScoreState(score, 0.7);
  t.equal(score.combo, 0);
  t.equal(score.comboTimer, 0);
  t.equal(score.bannerTimer, 0);
  t.end();
});

test("registerBonus floors awards and updates the banner state", (t) => {
  const score = createScoreState();
  const award = registerBonus(score, "Last Bird", 999.8);

  t.equal(award, 999);
  t.equal(score.total, 999);
  t.equal(score.lastAward, 999);
  t.equal(score.banner, "Last Bird");
  approx(t, score.bannerTimer, 1.3);
  t.end();
});
