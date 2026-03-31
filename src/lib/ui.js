import abs from "@stdlib/math-base-special-abs/lib/index.js";
import min from "@stdlib/math-base-special-min/lib/index.js";
import round from "@stdlib/math-base-special-round/lib/index.js";
import PI from "@stdlib/constants-float64-pi/lib/index.js";
import sin from "@stdlib/math-base-special-sin/lib/index.js";
import { rotate } from "./vector.js";
import { GROUND_HEIGHT, GROUND_Y, WORLD_HEIGHT, WORLD_WIDTH } from "./physics.js";

function toDeg(radians) {
  return round(((radians * 180) / PI) * 10) / 10;
}

function formatSigned(value, digits = 1) {
  const factor = digits === 0 ? 1 : 10 ** digits;
  const rounded = digits === 0 ? round(value) : round(value * factor) / factor;
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

function drawBackground(ctx, state) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, "#ffe8ae");
  sky.addColorStop(0.48, "#f8b067");
  sky.addColorStop(1, "#e16f51");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = "#fff9dc";
  ctx.beginPath();
  ctx.arc(1010, 118, 76, 0, PI * 2);
  ctx.fill();
  ctx.restore();

  for (let index = 0; index < 4; index += 1) {
    const drift = sin(state.elapsed * 0.08 + index) * 32;
    ctx.fillStyle = "rgba(255, 247, 235, 0.28)";
    ctx.beginPath();
    ctx.ellipse(170 + index * 250 + drift, 118 + index * 24, 92, 28, 0, 0, PI * 2);
    ctx.ellipse(220 + index * 250 + drift, 134 + index * 24, 110, 30, 0, 0, PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#b55642";
  ctx.beginPath();
  ctx.moveTo(0, 520);
  ctx.quadraticCurveTo(170, 420, 350, 500);
  ctx.quadraticCurveTo(520, 582, 688, 488);
  ctx.quadraticCurveTo(860, 408, 1042, 502);
  ctx.quadraticCurveTo(1160, 560, WORLD_WIDTH, 460);
  ctx.lineTo(WORLD_WIDTH, WORLD_HEIGHT);
  ctx.lineTo(0, WORLD_HEIGHT);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#6f8f40";
  ctx.fillRect(0, GROUND_Y, WORLD_WIDTH, GROUND_HEIGHT);

  ctx.fillStyle = "#87a755";
  for (let x = 0; x < WORLD_WIDTH; x += 20) {
    const blade = 6 + (x % 3);
    ctx.fillRect(x, GROUND_Y - blade, 10, blade);
  }
}

function drawSlingshot(ctx, state) {
  const { anchor, currentPull, activeBird } = state;
  const baseY = GROUND_Y - 6;

  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = "#5c3321";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(anchor.x - 16, baseY);
  ctx.lineTo(anchor.x - 10, anchor.y - 8);
  ctx.moveTo(anchor.x + 12, baseY);
  ctx.lineTo(anchor.x + 8, anchor.y - 30);
  ctx.stroke();

  if (activeBird && !activeBird.launched) {
    const bandY = anchor.y - 8;
    const birdX = activeBird.dragging ? activeBird.x : anchor.x;
    const birdY = activeBird.dragging ? activeBird.y : anchor.y;

    ctx.strokeStyle = "#d6b38d";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(anchor.x - 10, bandY);
    ctx.lineTo(birdX - 8, birdY);
    ctx.moveTo(anchor.x + 8, anchor.y - 26);
    ctx.lineTo(birdX + 8, birdY);
    ctx.stroke();
  }

  if (currentPull && activeBird && activeBird.dragging) {
    const strength = min(abs(currentPull.x) + abs(currentPull.y), 180) / 180;
    ctx.fillStyle = `rgba(191, 55, 37, ${0.08 + strength * 0.14})`;
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, 34 + strength * 20, 0, PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawBird(ctx, bird) {
  if (!bird || bird.spent) {
    return;
  }

  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.spin || 0);

  ctx.fillStyle = "#c73a27";
  ctx.beginPath();
  ctx.arc(0, 0, bird.radius, 0, PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8d2016";
  ctx.beginPath();
  ctx.arc(-6, -6, 6, 0, PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f8e8ce";
  ctx.beginPath();
  ctx.ellipse(0, 7, 11, 8, 0, 0, PI * 2);
  ctx.fill();

  const beak = [
    rotate({ x: 8, y: 0 }, 0),
    rotate({ x: 22, y: -3 }, 0),
    rotate({ x: 20, y: 5 }, 0)
  ];
  ctx.fillStyle = "#f0b340";
  ctx.beginPath();
  ctx.moveTo(beak[0].x, beak[0].y);
  ctx.lineTo(beak[1].x, beak[1].y);
  ctx.lineTo(beak[2].x, beak[2].y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(4, -2, 6, 0, PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1c1411";
  ctx.beginPath();
  ctx.arc(6, -2, 2.4, 0, PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPig(ctx, pig, elapsed) {
  if (!pig.alive) {
    return;
  }

  const bob = sin(elapsed * 1.9 + pig.wobbleSeed) * 1.2;

  ctx.save();
  ctx.translate(pig.x, pig.y + bob);

  ctx.fillStyle = "#8bc44d";
  ctx.beginPath();
  ctx.arc(0, 0, pig.radius, 0, PI * 2);
  ctx.fill();

  ctx.fillStyle = "#6d9f37";
  ctx.beginPath();
  ctx.arc(-8, -16, 6, 0, PI * 2);
  ctx.arc(8, -16, 6, 0, PI * 2);
  ctx.fill();

  ctx.fillStyle = "#a7d565";
  ctx.beginPath();
  ctx.ellipse(0, 6, 13, 10, 0, 0, PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2c231d";
  ctx.beginPath();
  ctx.arc(-6, -4, 3.5, 0, PI * 2);
  ctx.arc(6, -4, 3.5, 0, PI * 2);
  ctx.fill();

  ctx.fillStyle = "#4d3b30";
  ctx.beginPath();
  ctx.arc(-4, 6, 1.8, 0, PI * 2);
  ctx.arc(4, 6, 1.8, 0, PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBlock(ctx, block) {
  if (!block.alive) {
    return;
  }

  const damage = 1 - block.health / block.maxHealth;
  const woodTone = 188 - round(damage * 50);

  ctx.save();
  ctx.translate(block.x, block.y);

  ctx.fillStyle = `rgb(${woodTone}, ${115 - round(damage * 18)}, ${74 - round(damage * 10)})`;
  ctx.fillRect(-block.w / 2, -block.h / 2, block.w, block.h);

  ctx.strokeStyle = "rgba(83, 46, 28, 0.38)";
  ctx.lineWidth = 2;
  ctx.strokeRect(-block.w / 2, -block.h / 2, block.w, block.h);

  ctx.strokeStyle = "rgba(93, 47, 21, 0.22)";
  ctx.beginPath();
  ctx.moveTo(-block.w / 2 + 6, -block.h / 4);
  ctx.lineTo(block.w / 2 - 6, -block.h / 4);
  ctx.moveTo(-block.w / 2 + 6, block.h / 5);
  ctx.lineTo(block.w / 2 - 6, block.h / 5);
  ctx.stroke();

  ctx.restore();
}

function drawTrajectory(ctx, points) {
  ctx.save();
  ctx.fillStyle = "rgba(255, 249, 232, 0.92)";
  for (const point of points) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4.5, 0, PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBirdQueue(ctx, remainingBirds) {
  const startX = 62;
  const y = 68;

  ctx.save();
  ctx.fillStyle = "rgba(255, 248, 239, 0.9)";
  ctx.fillRect(32, 30, 142, 60);
  ctx.fillStyle = "#3a241d";
  ctx.font = "700 14px 'Trebuchet MS', sans-serif";
  ctx.fillText("Birds Left", 46, 52);

  for (let index = 0; index < remainingBirds; index += 1) {
    ctx.fillStyle = "#c73a27";
    ctx.beginPath();
    ctx.arc(startX + index * 26, y, 9, 0, PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHud(ctx, state) {
  const metrics = state.overlayMetrics;
  const flash = min(state.score.flash, 1);

  ctx.save();
  ctx.fillStyle = `rgba(40, 21, 16, ${0.74 + flash * 0.12})`;
  ctx.fillRect(24, 104, 330, 214);

  ctx.strokeStyle = `rgba(255, 236, 211, ${0.3 + flash * 0.2})`;
  ctx.strokeRect(24, 104, 330, 214);

  ctx.fillStyle = "#fff1dd";
  ctx.font = "700 18px Georgia, serif";
  ctx.fillText("Math Overlay", 42, 132);

  ctx.font = "600 14px 'Trebuchet MS', sans-serif";
  const rows = [
    ["Angle", `${formatSigned(toDeg(metrics.theta))} deg`],
    ["Speed", `${round(metrics.speed)} px/s`],
    ["vx / vy", `${round(metrics.vx)} / ${round(metrics.vy)} px/s`],
    ["Wind", `${formatSigned(metrics.wind, 0)} px/s^2`],
    ["Range", `${round(metrics.range)} px`],
    ["Max Height", `${round(metrics.maxHeight)} px`],
    ["Flight Time", `${round(metrics.timeOfFlight * 100) / 100} s`],
    ["Current |v|", `${round(metrics.currentSpeed)} px/s`]
  ];

  let y = 160;
  for (const [label, value] of rows) {
    ctx.fillStyle = "rgba(255, 239, 220, 0.78)";
    ctx.fillText(label, 42, y);
    ctx.fillStyle = "#fff8ee";
    ctx.fillText(value, 182, y);
    y += 20;
  }

  ctx.fillStyle = "rgba(255, 239, 220, 0.72)";
  ctx.font = "12px 'Trebuchet MS', sans-serif";
  ctx.fillText("y(t) = y0 + vy0 t + 0.5 g t^2", 42, 288);

  ctx.fillStyle = "#fff0da";
  ctx.font = "700 16px 'Trebuchet MS', sans-serif";
  ctx.fillText(`Score ${state.score.total}`, WORLD_WIDTH - 220, 52);
  ctx.fillText(`Combo x${round(state.comboMultiplier * 10) / 10}`, WORLD_WIDTH - 220, 76);

  ctx.fillStyle = "#fff4e6";
  ctx.font = "600 15px 'Trebuchet MS', sans-serif";
  ctx.fillText(state.level.name, WORLD_WIDTH - 280, 120);
  ctx.fillStyle = "rgba(255, 244, 230, 0.78)";
  ctx.fillText(state.level.subtitle, WORLD_WIDTH - 280, 143);

  const arrowWidth = 90;
  const baseX = WORLD_WIDTH - 274;
  const baseY = 176;
  const windLength = (state.level.wind / 65) * arrowWidth;
  ctx.strokeStyle = "#fff1dd";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.lineTo(baseX + windLength, baseY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(baseX + windLength, baseY);
  ctx.lineTo(baseX + windLength - (windLength >= 0 ? 12 : -12), baseY - 8);
  ctx.lineTo(baseX + windLength - (windLength >= 0 ? 12 : -12), baseY + 8);
  ctx.closePath();
  ctx.fillStyle = "#fff1dd";
  ctx.fill();

  ctx.restore();
}

function drawBanner(ctx, state) {
  if (state.score.bannerTimer <= 0) {
    return;
  }

  const rise = (1 - state.score.bannerTimer / 1.3) * 18;
  ctx.save();
  ctx.globalAlpha = min(state.score.bannerTimer, 1);
  ctx.fillStyle = "rgba(50, 24, 18, 0.8)";
  ctx.fillRect(WORLD_WIDTH / 2 - 170, 34 + rise, 340, 42);
  ctx.fillStyle = "#fff1dd";
  ctx.font = "700 20px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(`${state.score.banner} +${state.score.lastAward}`, WORLD_WIDTH / 2, 62 + rise);
  ctx.restore();
}

function drawStatusMessage(ctx, state) {
  if (state.status === "flying" || state.status === "aiming") {
    return;
  }

  const text =
    state.status === "level-clear"
      ? "Level Cleared - press N for the next stage"
      : "Out of birds - press R to try again";

  ctx.save();
  ctx.fillStyle = "rgba(35, 17, 14, 0.72)";
  ctx.fillRect(WORLD_WIDTH / 2 - 280, WORLD_HEIGHT - 112, 560, 56);
  ctx.fillStyle = "#fff1dd";
  ctx.font = "700 22px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(text, WORLD_WIDTH / 2, WORLD_HEIGHT - 76);
  ctx.restore();
}

export function drawScene(ctx, state) {
  const shakeX = sin(state.elapsed * 48) * state.shake * 7;
  const shakeY = sin(state.elapsed * 38 + PI / 3) * state.shake * 5;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawBackground(ctx, state);
  drawTrajectory(ctx, state.previewPoints);
  drawSlingshot(ctx, state);

  for (const block of state.level.blocks) {
    drawBlock(ctx, block);
  }

  for (const pig of state.level.pigs) {
    drawPig(ctx, pig, state.elapsed);
  }

  if (state.activeBird && state.activeBird.trail.length > 0) {
    ctx.save();
    ctx.fillStyle = "rgba(255, 247, 233, 0.28)";
    for (const point of state.activeBird.trail) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.r, 0, PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawBird(ctx, state.activeBird);
  ctx.restore();

  drawBirdQueue(ctx, state.remainingBirds);

  if (state.overlayVisible) {
    drawHud(ctx, state);
  }

  drawBanner(ctx, state);
  drawStatusMessage(ctx, state);
}
