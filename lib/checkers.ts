// lib/checkers.ts
// Checkers game logic and AI
// ~180 LOC

export type PieceType = "red" | "black" | null;
export type PieceKing = boolean;

export interface Piece {
  type: PieceType;
  isKing: boolean;
}

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
  captures?: Position[];
}

export type Board = (Piece | null)[][];

// Initialize standard 8x8 checkers board
export function initBoard(): Board {
  const board: Board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  // Black pieces on top (rows 0-2)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { type: "black", isKing: false };
      }
    }
  }

  // Red pieces on bottom (rows 5-7)
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { type: "red", isKing: false };
      }
    }
  }

  return board;
}

// Check if position is valid
function isValid(pos: Position): boolean {
  return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8;
}

// Get all valid moves for a piece at position
export function getValidMoves(
  board: Board,
  pos: Position,
  player: PieceType
): Move[] {
  const piece = board[pos.row][pos.col];
  if (!piece || piece.type !== player) return [];

  const moves: Move[] = [];
  const directions = piece.isKing
    ? [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ]
    : piece.type === "red"
    ? [
        [-1, -1],
        [-1, 1],
      ]
    : [
        [1, -1],
        [1, 1],
      ];

  // Check simple moves
  for (const [dr, dc] of directions) {
    const to = { row: pos.row + dr, col: pos.col + dc };
    if (isValid(to) && !board[to.row][to.col]) {
      moves.push({ from: pos, to });
    }
  }

  // Check capture moves (all 4 directions for captures)
  const captureDirs = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];
  for (const [dr, dc] of captureDirs) {
    const mid = { row: pos.row + dr, col: pos.col + dc };
    const to = { row: pos.row + 2 * dr, col: pos.col + 2 * dc };

    if (
      isValid(mid) &&
      isValid(to) &&
      board[mid.row][mid.col]?.type &&
      board[mid.row][mid.col]?.type !== player &&
      !board[to.row][to.col]
    ) {
      moves.push({ from: pos, to, captures: [mid] });
    }
  }

  return moves;
}

// Get all valid moves for a player
export function getAllValidMoves(board: Board, player: PieceType): Move[] {
  const moves: Move[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece?.type === player) {
        moves.push(...getValidMoves(board, { row, col }, player));
      }
    }
  }

  // Prioritize captures
  const captures = moves.filter((m) => m.captures && m.captures.length > 0);
  return captures.length > 0 ? captures : moves;
}

// Apply a move to the board (returns new board)
export function applyMove(board: Board, move: Move): Board {
  const newBoard = board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
  const piece = newBoard[move.from.row][move.from.col];

  if (!piece) return newBoard;

  // Remove captured pieces
  if (move.captures) {
    for (const cap of move.captures) {
      newBoard[cap.row][cap.col] = null;
    }
  }

  // Move piece
  newBoard[move.to.row][move.to.col] = piece;
  newBoard[move.from.row][move.from.col] = null;

  // Check for king promotion
  if (piece.type === "red" && move.to.row === 0) {
    newBoard[move.to.row][move.to.col]!.isKing = true;
  } else if (piece.type === "black" && move.to.row === 7) {
    newBoard[move.to.row][move.to.col]!.isKing = true;
  }

  return newBoard;
}

// Simple AI: pick random valid move, prefer captures
export function getAIMove(board: Board, player: PieceType): Move | null {
  const moves = getAllValidMoves(board, player);
  if (moves.length === 0) return null;

  // Prefer captures
  const captures = moves.filter((m) => m.captures && m.captures.length > 0);
  const pool = captures.length > 0 ? captures : moves;

  return pool[Math.floor(Math.random() * pool.length)];
}

// Check if game is over
export function checkGameOver(board: Board): PieceType | "draw" | null {
  let redCount = 0;
  let blackCount = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece?.type === "red") redCount++;
      if (piece?.type === "black") blackCount++;
    }
  }

  if (redCount === 0) return "black";
  if (blackCount === 0) return "red";

  // Check if current player has moves
  const redMoves = getAllValidMoves(board, "red");
  const blackMoves = getAllValidMoves(board, "black");

  if (redMoves.length === 0 && blackMoves.length === 0) return "draw";
  if (redMoves.length === 0) return "black";
  if (blackMoves.length === 0) return "red";

  return null;
}
