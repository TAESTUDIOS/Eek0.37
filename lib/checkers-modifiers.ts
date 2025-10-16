// lib/checkers-modifiers.ts
// Power-ups, piece personalities, and dynamic board modifiers for checkers
// ~200 LOC

import type { Position } from "./checkers";

export type PowerUpType = "speed" | "shield" | "double-jump";
export type PersonalityType = "brave" | "sneaky" | "heavy" | "scout" | "normal";
export type BoardModifierType = "fog-of-war" | "rotating" | "weather-rain" | "weather-wind" | "none";

export interface PowerUp {
  type: PowerUpType;
  position: Position;
  active: boolean;
}

export interface PiecePersonality {
  position: Position;
  type: PersonalityType;
}

export interface ActiveEffect {
  position: Position;
  type: "speed" | "shield" | "double-jump";
  turnsRemaining: number;
}

export interface BoardState {
  powerUps: PowerUp[];
  personalities: Map<string, PersonalityType>;
  activeEffects: ActiveEffect[];
  currentModifier: BoardModifierType;
  modifierTurnsRemaining: number;
  rotation: number; // 0, 90, 180, 270
  fogCenter?: Position;
}

// Generate random power-ups on the board
export function generatePowerUps(count: number = 3): PowerUp[] {
  const powerUps: PowerUp[] = [];
  const types: PowerUpType[] = ["speed", "shield", "double-jump"];
  const usedPositions = new Set<string>();

  for (let i = 0; i < count; i++) {
    let row, col;
    let posKey;
    
    // Find unique position on playable squares (odd sum of row+col)
    do {
      row = Math.floor(Math.random() * 8);
      col = Math.floor(Math.random() * 8);
      posKey = `${row}-${col}`;
    } while (
      (row + col) % 2 === 0 || // Not a playable square
      usedPositions.has(posKey) ||
      row < 2 || row > 5 // Avoid starting positions
    );

    usedPositions.add(posKey);
    powerUps.push({
      type: types[Math.floor(Math.random() * types.length)],
      position: { row, col },
      active: true,
    });
  }

  return powerUps;
}

// Assign random personalities to pieces
export function generatePersonalities(pieceCount: number = 4): Map<string, PersonalityType> {
  const personalities = new Map<string, PersonalityType>();
  const types: PersonalityType[] = ["brave", "sneaky", "heavy", "scout"];
  
  for (let i = 0; i < pieceCount; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    personalities.set(`piece-${i}`, type);
  }
  
  return personalities;
}

// Get random board modifier
export function getRandomModifier(): BoardModifierType {
  const modifiers: BoardModifierType[] = [
    "fog-of-war",
    "rotating",
    "weather-rain",
    "weather-wind",
    "none",
  ];
  return modifiers[Math.floor(Math.random() * modifiers.length)];
}

// Check if position is visible in fog of war
export function isVisibleInFog(pos: Position, playerPieces: Position[]): boolean {
  return playerPieces.some((piece) => {
    const distance = Math.max(
      Math.abs(piece.row - pos.row),
      Math.abs(piece.col - pos.col)
    );
    return distance <= 2;
  });
}

// Apply rotation to position
export function rotatePosition(pos: Position, rotation: number): Position {
  const { row, col } = pos;
  
  switch (rotation) {
    case 90:
      return { row: col, col: 7 - row };
    case 180:
      return { row: 7 - row, col: 7 - col };
    case 270:
      return { row: 7 - col, col: row };
    default:
      return pos;
  }
}

// Apply weather effect to move
export function applyWeatherEffect(
  move: Position,
  weather: "rain" | "wind" | "none"
): Position {
  if (weather === "none") return move;

  const { row, col } = move;

  if (weather === "rain") {
    // Random slip in adjacent direction
    const slips = [
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 },
    ];
    const validSlips = slips.filter(
      (s) => s.row >= 0 && s.row < 8 && s.col >= 0 && s.col < 8
    );
    
    if (Math.random() < 0.3 && validSlips.length > 0) {
      return validSlips[Math.floor(Math.random() * validSlips.length)];
    }
  }

  if (weather === "wind") {
    // Push in a consistent direction
    const windDir = Math.floor(Math.random() * 4);
    const pushes = [
      { row: row - 1, col }, // up
      { row: row + 1, col }, // down
      { row, col: col - 1 }, // left
      { row, col: col + 1 }, // right
    ];
    
    const pushed = pushes[windDir];
    if (pushed.row >= 0 && pushed.row < 8 && pushed.col >= 0 && pushed.col < 8) {
      return pushed;
    }
  }

  return move;
}

// Get power-up description
export function getPowerUpDescription(type: PowerUpType): string {
  switch (type) {
    case "speed":
      return "⚡ Speed: Jump 3 spaces on next move!";
    case "shield":
      return "🛡️ Shield: Immune to capture for 1 turn!";
    case "double-jump":
      return "🎯 Double Jump: Make two jumps in one turn!";
  }
}

// Get personality description
export function getPersonalityDescription(type: PersonalityType): string {
  switch (type) {
    case "brave":
      return "⚔️ Brave: Can't retreat, only forward!";
    case "sneaky":
      return "🥷 Sneaky: Can move backward without being king!";
    case "heavy":
      return "🛡️ Heavy: Requires 2 captures to eliminate!";
    case "scout":
      return "👁️ Scout: Reveals opponent's next move!";
    case "normal":
      return "Standard piece";
  }
}

// Get modifier description
export function getModifierDescription(type: BoardModifierType): string {
  switch (type) {
    case "fog-of-war":
      return "🌫️ Fog of War: Limited visibility!";
    case "rotating":
      return "🔄 Rotating Board: Board rotates every 5 moves!";
    case "weather-rain":
      return "🌧️ Rain: Pieces may slip randomly!";
    case "weather-wind":
      return "💨 Wind: Pieces get pushed by wind!";
    case "none":
      return "Clear conditions";
  }
}
