// scribble_backend/src/types/gameroom.ts

import { Player } from "./player";

export interface GameRoom {
  roomNo: number;
  players: Player[];
  currentDrawerIndex: number;
  wordToGuess: string;
  guessedCorrectly: Set<string>;
  points: Map<string, number>;
}
