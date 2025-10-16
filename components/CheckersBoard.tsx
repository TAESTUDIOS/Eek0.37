// components/CheckersBoard.tsx
// Checkers board UI component
// ~200 LOC

"use client";

import { Board, Position, Move } from "@/lib/checkers";
import type { PowerUp, BoardModifierType, PersonalityType } from "@/lib/checkers-modifiers";
import { getPowerUpDescription, getPersonalityDescription } from "@/lib/checkers-modifiers";

interface CheckersBoardProps {
  board: Board;
  selectedPos: Position | null;
  validMoves: Move[];
  onSquareClick: (pos: Position) => void;
  disabled?: boolean;
  powerUps?: PowerUp[];
  personalities?: Map<string, PersonalityType>;
  boardModifier?: BoardModifierType;
  fogVisible?: (pos: Position) => boolean;
}

export default function CheckersBoard({
  board,
  selectedPos,
  validMoves,
  onSquareClick,
  disabled = false,
  powerUps = [],
  personalities,
  boardModifier = "none",
  fogVisible,
}: CheckersBoardProps) {
  const isSelected = (row: number, col: number) =>
    selectedPos?.row === row && selectedPos?.col === col;

  const isValidMove = (row: number, col: number) =>
    validMoves.some((m) => m.to.row === row && m.to.col === col);

  const isCapture = (row: number, col: number) =>
    validMoves.some(
      (m) => m.to.row === row && m.to.col === col && m.captures && m.captures.length > 0
    );

  const getPowerUpAt = (row: number, col: number) =>
    powerUps.find((p) => p.position.row === row && p.position.col === col && p.active);

  const getPowerUpIcon = (type: string) => {
    switch (type) {
      case "speed": return "⚡";
      case "shield": return "🛡️";
      case "double-jump": return "🎯";
      default: return "";
    }
  };

  const getPersonalityIcon = (type: PersonalityType | undefined) => {
    switch (type) {
      case "brave": return "⚔️";
      case "sneaky": return "🥷";
      case "heavy": return "🛡️";
      case "scout": return "👁️";
      default: return "";
    }
  };

  return (
    <div className="inline-block p-2 sm:p-4 bg-[var(--surface-1)] rounded-lg shadow-elevated w-full max-w-4xl mx-auto border border-[var(--border)]">
      <div className="grid grid-cols-8 gap-0 border-2 sm:border-4 border-[var(--border)] rounded-md overflow-hidden shadow-subtle min-h-[400px] sm:min-h-[500px] md:min-h-[600px]">
        {board.map((row, rowIdx) =>
          row.map((piece, colIdx) => {
            const isDark = (rowIdx + colIdx) % 2 === 1;
            const selected = isSelected(rowIdx, colIdx);
            const validMove = isValidMove(rowIdx, colIdx);
            const capture = isCapture(rowIdx, colIdx);
            const powerUp = getPowerUpAt(rowIdx, colIdx);
            const inFog = fogVisible && !fogVisible({ row: rowIdx, col: colIdx });
            const pieceKey = `${rowIdx}-${colIdx}`;
            const personality = personalities?.get(pieceKey);

            return (
              <button
                key={`${rowIdx}-${colIdx}`}
                onClick={() => !disabled && onSquareClick({ row: rowIdx, col: colIdx })}
                disabled={disabled}
                className={`
                  aspect-square flex items-center justify-center
                  transition-all duration-200 relative touch-manipulation
                  ${isDark ? "bg-[var(--surface-2)]" : "bg-[var(--surface-0)]"}
                  ${selected ? "ring-2 sm:ring-4 ring-[var(--accent)] ring-inset" : ""}
                  ${validMove && !disabled ? "cursor-pointer hover:brightness-110 active:brightness-125" : ""}
                  ${!isDark && !disabled ? "cursor-default" : ""}
                  ${disabled ? "opacity-60 cursor-not-allowed" : ""}
                  ${inFog ? "opacity-30" : ""}
                  ${powerUp ? "bg-gradient-to-br from-[var(--surface-2)] to-purple-900/20" : ""}
                `}
              >
                {/* Valid move indicator */}
                {validMove && !disabled && (
                  <div
                    className={`absolute inset-0 flex items-center justify-center ${
                      capture ? "animate-pulse" : ""
                    }`}
                  >
                    <div
                      className={`rounded-full ${
                        capture
                          ? "w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-red-400/40 border-2 border-red-500"
                          : "w-3 h-3 sm:w-4 sm:h-4 bg-green-400/60"
                      }`}
                    />
                  </div>
                )}

                {/* Power-up indicator */}
                {powerUp && !piece && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-2xl sm:text-3xl animate-pulse">
                      {getPowerUpIcon(powerUp.type)}
                    </div>
                  </div>
                )}

                {/* Piece */}
                {piece && (
                  <div
                    className={`
                      w-[70%] h-[70%] max-w-12 max-h-12 rounded-full
                      flex items-center justify-center
                      shadow-lg border-2 relative z-10
                      ${
                        piece.type === "red"
                          ? "bg-gradient-to-br from-red-500 to-red-700 border-red-800"
                          : "bg-gradient-to-br from-blue-500 to-blue-700 border-blue-800"
                      }
                      ${selected ? "scale-110" : ""}
                      transition-transform duration-200
                    `}
                  >
                    {piece.isKing && (
                      <span className="text-yellow-300 text-base sm:text-lg md:text-xl font-bold">♔</span>
                    )}
                    {!piece.isKing && personality && personality !== "normal" && (
                      <span className="text-xs absolute -top-1 -right-1 bg-purple-600 rounded-full w-4 h-4 flex items-center justify-center">
                        {getPersonalityIcon(personality)}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

    </div>
  );
}
