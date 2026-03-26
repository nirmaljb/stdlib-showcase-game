import abs from "@stdlib/math-base-special-abs/lib/index.js";
import floor from "@stdlib/math-base-special-floor/lib/index.js";
import max from "@stdlib/math-base-special-max/lib/index.js";
import min from "@stdlib/math-base-special-min/lib/index.js";
import pow from "@stdlib/math-base-special-pow/lib/index.js";
import { applyExponentialDecay } from "./physics.js";
import { dot } from "./vector.js";

const COMBO_WINDOW = 1.1;

export function createScoreState() {
  return {
    total: 0,
    combo: 0,
    comboTimer: 0,
    flash: 0,
    lastAward: 0,
    banner: "",
    bannerTimer: 0
  };
}

export function comboMultiplier(combo) {
  return min(pow(1.4, combo > 0 ? combo - 1 : 0), 4.25);
}

export function impactForce(mass, velocity, normal) {
  return mass * abs(dot(velocity, normal));
}

export function tickScoreState(score, dt) {
  if (score.comboTimer > 0) {
    score.comboTimer = max(0, score.comboTimer - dt);
    if (score.comboTimer === 0) {
      score.combo = 0;
    }
  }

  score.flash = applyExponentialDecay(score.flash, 8.5, dt);
  score.bannerTimer = max(0, score.bannerTimer - dt);
}

export function registerImpact(score, force, type) {
  score.combo = score.comboTimer > 0 ? score.combo + 1 : 1;
  score.comboTimer = COMBO_WINDOW;

  const multiplier = comboMultiplier(score.combo);
  const capped = min(force, 300);
  const base = floor(capped * (type === "pig" ? 7.6 : 5.8));
  const bonus = type === "pig" ? 180 : 90;
  const award = floor(base * multiplier) + bonus;

  score.total += award;
  score.lastAward = award;
  score.flash = 1;
  score.banner = type === "pig" ? "Pig Popped" : "Block Cracked";
  score.bannerTimer = 0.9;

  return award;
}

export function registerBonus(score, label, amount) {
  const award = floor(amount);
  score.total += award;
  score.lastAward = award;
  score.flash = 1;
  score.banner = label;
  score.bannerTimer = 1.3;
  return award;
}
