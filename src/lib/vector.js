import atan2 from "@stdlib/math-base-special-atan2/lib/index.js";
import cos from "@stdlib/math-base-special-cos/lib/index.js";
import hypot from "@stdlib/math-base-special-hypot/lib/index.js";
import max from "@stdlib/math-base-special-max/lib/index.js";
import sin from "@stdlib/math-base-special-sin/lib/index.js";
import eps from "@stdlib/constants-float64-eps";

const EPSILON = eps;

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtract(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(vector, factor) {
  return { x: vector.x * factor, y: vector.y * factor };
}

export function magnitude(vector) {
  return hypot(vector.x, vector.y);
}

export function normalize(vector) {
  const length = max(magnitude(vector), EPSILON);
  return {
    x: vector.x / length,
    y: vector.y / length
  };
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

export function angle(vector) {
  return atan2(vector.y, vector.x);
}

export function rotate(vector, theta) {
  return {
    x: vector.x * cos(theta) - vector.y * sin(theta),
    y: vector.x * sin(theta) + vector.y * cos(theta)
  };
}

export function clampMagnitude(vector, limit) {
  const length = magnitude(vector);
  if (length <= limit) {
    return { x: vector.x, y: vector.y };
  }
  return scale(normalize(vector), limit);
}

export function reflect(vector, normal, restitution = 0.42) {
  const alongNormal = dot(vector, normal);
  return subtract(vector, scale(normal, (1 + restitution) * alongNormal));
}

export { EPSILON };
