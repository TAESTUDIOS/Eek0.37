// app/checkers/page.tsx
// Checkers game page - play against Eeko
// ~280 LOC

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import CheckersBoard from "@/components/CheckersBoard";
import {
  initBoard,
  getValidMoves,
  applyMove,
  getAIMove,
  checkGameOver,
  type Board,
  type Position,
  type Move,
  type PieceType,
} from "@/lib/checkers";

export default function CheckersPage() {
  const [board, setBoard] = useState<Board>(initBoard());
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<PieceType>("red");
  const [gameOver, setGameOver] = useState<PieceType | "draw" | null>(null);
  const [thinking, setThinking] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<"easy" | "medium">("easy");
  const [eekoMood, setEekoMood] = useState<"happy" | "thinking" | "amazed" | "wink">("happy");
  const [eekoMessage, setEekoMessage] = useState("Ready to play!");

  // Check game over
  useEffect(() => {
    const result = checkGameOver(board);
    if (result) {
      setGameOver(result);
    }
  }, [board]);

  // AI turn
  useEffect(() => {
    if (currentPlayer === "black" && !gameOver && !thinking) {
      setThinking(true);
      const delay = difficulty === "easy" ? 800 : 1200;

      setTimeout(() => {
        const aiMove = getAIMove(board, "black");
        if (aiMove) {
          const newBoard = applyMove(board, aiMove);
          setBoard(newBoard);
          setCurrentPlayer("red");
          addMoveToHistory("Eeko", aiMove);
          
          // Eeko reactions to own moves
          if (aiMove.captures && aiMove.captures.length > 0) {
            setEekoMood("wink");
            const reactions = [
              "Got you!",
              "Hehe, mine now!",
              "That's how it's done!",
              "Nice try though!"
            ];
            setEekoMessage(reactions[Math.floor(Math.random() * reactions.length)]);
          } else {
            setEekoMood("happy");
            const reactions = [
              "Your turn!",
              "Let's see what you got!",
              "Make your move!",
              "I'm ready!"
            ];
            setEekoMessage(reactions[Math.floor(Math.random() * reactions.length)]);
          }
        }
        setThinking(false);
      }, delay);
    }
  }, [currentPlayer, gameOver, thinking, board, difficulty]);

  const addMoveToHistory = (player: string, move: Move) => {
    const from = `${String.fromCharCode(65 + move.from.col)}${8 - move.from.row}`;
    const to = `${String.fromCharCode(65 + move.to.col)}${8 - move.to.row}`;
    const capture = move.captures && move.captures.length > 0 ? " (capture)" : "";
    setMoveHistory((prev) => [`${player}: ${from} → ${to}${capture}`, ...prev].slice(0, 10));

    // Eeko reactions to player moves
    if (player === "You") {
      if (capture) {
        setEekoMood("amazed");
        const reactions = [
          "Oh no! Nice capture!",
          "You got me there!",
          "Impressive move!",
          "I didn't see that coming!"
        ];
        setEekoMessage(reactions[Math.floor(Math.random() * reactions.length)]);
      } else {
        setEekoMood("thinking");
        const reactions = [
          "Interesting choice...",
          "Let me think about this...",
          "Hmm, I see what you're doing",
          "Good move!"
        ];
        setEekoMessage(reactions[Math.floor(Math.random() * reactions.length)]);
      }
    }
  };

  const handleSquareClick = (pos: Position) => {
    if (currentPlayer !== "red" || gameOver || thinking) return;

    const piece = board[pos.row][pos.col];

    // Select piece
    if (piece?.type === "red" && !selectedPos) {
      setSelectedPos(pos);
      setValidMoves(getValidMoves(board, pos, "red"));
      return;
    }

    // Deselect
    if (selectedPos && pos.row === selectedPos.row && pos.col === selectedPos.col) {
      setSelectedPos(null);
      setValidMoves([]);
      return;
    }

    // Make move
    if (selectedPos) {
      const move = validMoves.find((m) => m.to.row === pos.row && m.to.col === pos.col);
      if (move) {
        const newBoard = applyMove(board, move);
        setBoard(newBoard);
        setCurrentPlayer("black");
        setSelectedPos(null);
        setValidMoves([]);
        addMoveToHistory("You", move);
      } else {
        // Try selecting different piece
        if (piece?.type === "red") {
          setSelectedPos(pos);
          setValidMoves(getValidMoves(board, pos, "red"));
        }
      }
    }
  };

  const resetGame = () => {
    setBoard(initBoard());
    setSelectedPos(null);
    setValidMoves([]);
    setCurrentPlayer("red");
    setGameOver(null);
    setThinking(false);
    setMoveHistory([]);
    setEekoMood("happy");
    setEekoMessage("Ready to play!");
  };

  // Update Eeko's mood when game ends
  useEffect(() => {
    if (gameOver === "black") {
      setEekoMood("happy");
      setEekoMessage("Good game! Want a rematch?");
    } else if (gameOver === "red") {
      setEekoMood("amazed");
      setEekoMessage("You won! Well played!");
    } else if (gameOver === "draw") {
      setEekoMood("wink");
      setEekoMessage("A draw! We're evenly matched!");
    }
  }, [gameOver]);

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-3 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--fg)]">Checkers with Eeko</h1>
          <p className="text-xs sm:text-sm text-[var(--fg)]/60 mt-1">
            Play a classic game of checkers against Eeko
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {/* Game Board */}
          <div className="lg:col-span-2 flex flex-col items-center order-1">
            {/* Eeko Profile */}
            <div className="w-full max-w-[min(100vw-2rem,600px)] mb-3 sm:mb-4 p-3 sm:p-4 border border-[var(--border)] rounded-lg bg-[var(--surface-1)] flex items-center gap-3 sm:gap-4">
              <div className="relative w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0">
                <Image
                  src={`/images/emojis/${eekoMood === "thinking" ? "happy" : eekoMood}.png`}
                  alt="Eeko"
                  width={64}
                  height={64}
                  className="rounded-full border-2 border-gray-700 shadow-lg"
                  priority
                />
                {thinking && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--fg)]">Eeko</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-200">AI Opponent</span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--fg)]/70 mt-1 italic">"{eekoMessage}"</p>
              </div>
            </div>

            <CheckersBoard
              board={board}
              selectedPos={selectedPos}
              validMoves={validMoves}
              onSquareClick={handleSquareClick}
              disabled={currentPlayer !== "red" || !!gameOver || thinking}
            />

            {/* Status */}
            <div className="mt-3 sm:mt-4 md:mt-6 text-center w-full">
              {gameOver ? (
                <div className="space-y-2 sm:space-y-3">
                  <div className="text-xl sm:text-2xl font-bold">
                    {gameOver === "red" && "🎉 You Win!"}
                    {gameOver === "black" && "🤖 Eeko Wins!"}
                    {gameOver === "draw" && "🤝 Draw!"}
                  </div>
                  <button
                    onClick={resetGame}
                    className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 font-medium text-sm sm:text-base touch-manipulation"
                  >
                    Play Again
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <div className="text-base sm:text-lg font-medium">
                      {currentPlayer === "red" ? "Your Turn" : "Eeko's Turn"}
                    </div>
                    {currentPlayer === "black" && (
                      <div className="w-3 h-3 bg-gray-700 rounded-full animate-pulse" />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-3 sm:space-y-4 order-2">
            {/* Game Controls */}
            <div className="p-3 sm:p-4 border border-[var(--border)] rounded-lg bg-[var(--surface-1)]">
              <h2 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">Game Controls</h2>
              <div className="space-y-2 sm:space-y-3">
                <button
                  onClick={resetGame}
                  className="w-full px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] text-sm touch-manipulation"
                >
                  New Game
                </button>

                <div className="space-y-1 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as "easy" | "medium")}
                    disabled={!gameOver && moveHistory.length > 0}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface-1)] text-sm disabled:opacity-50 touch-manipulation"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                  </select>
                  {!gameOver && moveHistory.length > 0 && (
                    <p className="text-[10px] sm:text-xs text-[var(--fg)]/50">
                      Start new game to change difficulty
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Move History */}
            <div className="p-3 sm:p-4 border border-[var(--border)] rounded-lg bg-[var(--surface-1)]">
              <h2 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">Recent Moves</h2>
              {moveHistory.length === 0 ? (
                <p className="text-xs sm:text-sm text-[var(--fg)]/50">No moves yet</p>
              ) : (
                <div className="space-y-1 text-xs sm:text-sm max-h-40 sm:max-h-64 overflow-y-auto">
                  {moveHistory.map((move, idx) => (
                    <div
                      key={idx}
                      className="py-1 px-2 rounded bg-[var(--surface-2)] text-[var(--fg)]/80"
                    >
                      {move}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rules - Collapsible on mobile */}
            <details className="p-3 sm:p-4 border border-[var(--border)] rounded-lg bg-[var(--surface-1)] lg:open">
              <summary className="text-sm sm:text-base font-semibold cursor-pointer list-none flex items-center justify-between lg:pointer-events-none">
                <span>How to Play</span>
                <span className="lg:hidden">▼</span>
              </summary>
              <ul className="text-xs sm:text-sm space-y-1 sm:space-y-2 text-[var(--fg)]/80 mt-2 sm:mt-3">
                <li>• Tap a red piece to select it</li>
                <li>• Tap a highlighted square to move</li>
                <li>• Jump over Eeko's pieces to capture them</li>
                <li>• Reach the opposite end to become a king</li>
                <li>• Kings can move in all directions</li>
                <li>• Capture all of Eeko's pieces to win!</li>
              </ul>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
