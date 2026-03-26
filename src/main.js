import "./style.css";
import { createGame } from "./lib/game.js";

const canvas = document.querySelector("#game");

if (!canvas) {
  throw new Error("Missing #game canvas");
}

createGame(canvas);
