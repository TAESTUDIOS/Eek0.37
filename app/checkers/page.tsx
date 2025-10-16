// app/checkers/page.tsx
// Enhanced checkers with power-ups, personalities, and modifiers
// ~450 LOC

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
import {
  generatePowerUps,
  generatePersonalities,
  getRandomModifier,
  isVisibleInFog,
  getPowerUpDescription,
  getModifierDescription,
  type PowerUp,
  type BoardModifierType,
  type PersonalityType,
} from "@/lib/checkers-modifiers";

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
  
  // New game features
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [personalities, setPersonalities] = useState<Map<string, PersonalityType>>(new Map());
  const [boardModifier, setBoardModifier] = useState<BoardModifierType>("none");
  const [moveCount, setMoveCount] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [enhancedMode, setEnhancedMode] = useState(false);
  const [collectedPowerUps, setCollectedPowerUps] = useState<string[]>([]);

  // Check game over
  useEffect(() => {
    const result = checkGameOver(board);
    if (result) setGameOver(result);
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
          
          if (aiMove.captures && aiMove.captures.length > 0) {
            setEekoMood("wink");
            setEekoMessage(["Got you!", "Hehe, mine now!", "That's how it's done!"][Math.floor(Math.random() * 3)]);
          } else {
            setEekoMood("happy");
            setEekoMessage(["Your turn!", "Let's see what you got!", "Make your move!"][Math.floor(Math.random() * 3)]);
          }
        }
        setThinking(false);
      }, delay);
    }
  }, [currentPlayer, gameOver, thinking, board, difficulty]);

  // Board modifiers effect
  useEffect(() => {
    if (!enhancedMode || !boardModifier || boardModifier === "none") return;
    
    // Rotating board every 5 moves
    if (boardModifier === "rotating" && moveCount > 0 && moveCount % 5 === 0) {
      setRotation((prev) => (prev + 90) % 360);
      setEekoMessage("🔄 Board rotated!");
    }
  }, [moveCount, boardModifier, enhancedMode]);

  const addMoveToHistory = (player: string, move: Move) => {
    const from = `${String.fromCharCode(65 + move.from.col)}${8 - move.from.row}`;
    const to = `${String.fromCharCode(65 + move.to.col)}${8 - move.to.row}`;
    const capture = move.captures && move.captures.length > 0 ? " (capture)" : "";
    setMoveHistory((prev) => [`${player}: ${from} → ${to}${capture}`, ...prev].slice(0, 10));

    if (player === "You") {
      if (capture) {
        setEekoMood("amazed");
        setEekoMessage(["Oh no! Nice capture!", "You got me there!", "Impressive move!"][Math.floor(Math.random() * 3)]);
      } else {
        setEekoMood("thinking");
        setEekoMessage(["Interesting choice...", "Let me think...", "Good move!"][Math.floor(Math.random() * 3)]);
      }
    }
  };

  const handleSquareClick = (pos: Position) => {
    if (currentPlayer !== "red" || gameOver || thinking) return;

    const piece = board[pos.row][pos.col];

    // Check for power-up collection
    if (enhancedMode) {
      const powerUp = powerUps.find(p => p.position.row === pos.row && p.position.col === pos.col && p.active);
      if (powerUp && piece?.type === "red") {
        setPowerUps(prev => prev.map(p => 
          p.position.row === pos.row && p.position.col === pos.col ? { ...p, active: false } : p
        ));
        setCollectedPowerUps(prev => [...prev, powerUp.type]);
        setEekoMessage(`You collected ${getPowerUpDescription(powerUp.type)}`);
      }
    }

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
        setMoveCount(prev => prev + 1);
        addMoveToHistory("You", move);
      } else if (piece?.type === "red") {
        setSelectedPos(pos);
        setValidMoves(getValidMoves(board, pos, "red"));
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
    setMoveCount(0);
    setRotation(0);
    setCollectedPowerUps([]);
    
    if (enhancedMode) {
      setPowerUps(generatePowerUps(3));
      setPersonalities(generatePersonalities(4));
      setBoardModifier(getRandomModifier());
    }
  };

  const toggleEnhancedMode = () => {
    setEnhancedMode(!enhancedMode);
    if (!enhancedMode) {
      setPowerUps(generatePowerUps(3));
      setPersonalities(generatePersonalities(4));
      setBoardModifier(getRandomModifier());
    } else {
      setPowerUps([]);
      setPersonalities(new Map());
      setBoardModifier("none");
    }
    resetGame();
  };

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

  const fogVisibleFn = (pos: Position) => {
    if (boardModifier !== "fog-of-war") return true;
    const playerPieces: Position[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c]?.type === "red") {
          playerPieces.push({ row: r, col: c });
        }
      }
    }
    return isVisibleInFog(pos, playerPieces);
  };

  return (
    <div className="min-h-screen p-0 sm:p-2">
      <div className="w-full">
        <div className="mb-3 sm:mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--fg)]">Checkers with Eeko</h1>
            <p className="text-xs sm:text-sm text-[var(--fg)]/60 mt-1">
              Play checkers {enhancedMode && "with power-ups & modifiers!"}
            </p>
          </div>
          <button
            onClick={toggleEnhancedMode}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              enhancedMode 
                ? "bg-purple-600 text-white hover:bg-purple-700" 
                : "border border-[var(--border)] hover:bg-[var(--surface-2)]"
            }`}
          >
            {enhancedMode ? "⚡ Enhanced" : "Classic"}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 md:gap-6">
          <div className="flex-1 flex flex-col items-center">
            {/* Eeko Profile */}
            <div className="w-full mb-3 sm:mb-4 p-3 sm:p-4 border border-[var(--border)] rounded-lg bg-[var(--surface-1)] flex items-center gap-3 sm:gap-4">
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

            {/* Board Modifier Badge */}
            {enhancedMode && boardModifier !== "none" && (
              <div className="w-full mb-2 px-3 py-1 bg-purple-900/30 border border-purple-500/30 rounded-full text-xs sm:text-sm text-center">
                {getModifierDescription(boardModifier)}
              </div>
            )}

            <div style={{ transform: `rotate(${rotation}deg)`, transition: "transform 0.5s ease" }}>
              <CheckersBoard
                board={board}
                selectedPos={selectedPos}
                validMoves={validMoves}
                onSquareClick={handleSquareClick}
                disabled={currentPlayer !== "red" || !!gameOver || thinking}
                powerUps={enhancedMode ? powerUps : []}
                personalities={enhancedMode ? personalities : undefined}
                boardModifier={enhancedMode ? boardModifier : "none"}
                fogVisible={enhancedMode ? fogVisibleFn : undefined}
              />
            </div>

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
          <div className="w-full lg:w-80 xl:w-96 space-y-3 sm:space-y-4 flex-shrink-0">
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
                </div>
              </div>
            </div>

            {/* Collected Power-ups */}
            {enhancedMode && collectedPowerUps.length > 0 && (
              <div className="p-3 sm:p-4 border border-purple-500/30 rounded-lg bg-purple-900/20">
                <h2 className="text-sm sm:text-base font-semibold mb-2">Power-ups Collected</h2>
                <div className="flex flex-wrap gap-2">
                  {collectedPowerUps.map((type, idx) => (
                    <span key={idx} className="px-2 py-1 bg-purple-600 rounded text-xs">
                      {type === "speed" && "⚡"}
                      {type === "shield" && "🛡️"}
                      {type === "double-jump" && "🎯"}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Move History */}
            <div className="p-3 sm:p-4 border border-[var(--border)] rounded-lg bg-[var(--surface-1)]">
              <h2 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">Recent Moves</h2>
              {moveHistory.length === 0 ? (
                <p className="text-xs sm:text-sm text-[var(--fg)]/50">No moves yet</p>
              ) : (
                <div className="space-y-1 text-xs sm:text-sm max-h-40 sm:max-h-64 overflow-y-auto">
                  {moveHistory.map((move, idx) => (
                    <div key={idx} className="py-1 px-2 rounded bg-[var(--surface-2)] text-[var(--fg)]/80">
                      {move}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rules */}
            <details className="p-3 sm:p-4 border border-[var(--border)] rounded-lg bg-[var(--surface-1)] lg:open">
              <summary className="text-sm sm:text-base font-semibold cursor-pointer list-none flex items-center justify-between lg:pointer-events-none">
                <span>How to Play</span>
                <span className="lg:hidden">▼</span>
              </summary>
              <ul className="text-xs sm:text-sm space-y-1 sm:space-y-2 text-[var(--fg)]/80 mt-2 sm:mt-3">
                <li>• Tap a red piece to select it</li>
                <li>• Tap a highlighted square to move</li>
                <li>• Jump over Eeko's pieces to capture them</li>
                {enhancedMode && <li>• Collect power-ups for special abilities!</li>}
                {enhancedMode && <li>• Watch out for board modifiers!</li>}
                <li>• Reach the opposite end to become a king</li>
                <li>• Capture all of Eeko's pieces to win!</li>
              </ul>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
