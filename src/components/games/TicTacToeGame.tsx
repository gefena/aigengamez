"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "@/app/games/[id]/page.module.css";

const checkWinner = (squares: (string | null)[]) => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  if (!squares.includes(null)) return "Draw";
  return null;
};

const getBestMove = (squares: (string | null)[], player: "X" | "O"): number => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    const line = [squares[a], squares[b], squares[c]];
    if (line.filter(v => v === player).length === 2 && line.includes(null)) {
      if (squares[a] === null) return a;
      if (squares[b] === null) return b;
      if (squares[c] === null) return c;
    }
  }
  return -1;
};

const minimax = (squares: (string | null)[], depth: number, isMaximizing: boolean): number => {
  const result = checkWinner(squares);
  if (result === "O") return 10 - depth;
  if (result === "X") return depth - 10;
  if (result === "Draw") return 0;

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (squares[i] === null) {
        squares[i] = "O";
        const score = minimax(squares, depth + 1, false);
        squares[i] = null;
        bestScore = Math.max(score, bestScore);
      }
    }
    return bestScore;
  } else {
    let bestScore = Infinity;
    for (let i = 0; i < 9; i++) {
      if (squares[i] === null) {
        squares[i] = "X";
        const score = minimax(squares, depth + 1, true);
        squares[i] = null;
        bestScore = Math.min(score, bestScore);
      }
    }
    return bestScore;
  }
};

const getAIMove = (currentBoard: (string | null)[], currentDifficulty: string): number => {
  const emptyIndices = currentBoard.map((val, idx) => val === null ? idx : null).filter(val => val !== null) as number[];
  if (emptyIndices.length === 0) return -1;

  if (currentDifficulty === "Easy") {
    return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  }

  if (currentDifficulty === "Medium") {
    const winMove = getBestMove(currentBoard, "O");
    if (winMove !== -1) return winMove;
    const blockMove = getBestMove(currentBoard, "X");
    if (blockMove !== -1) return blockMove;
    return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  }

  if (currentDifficulty === "Hard") {
    let bestScore = -Infinity;
    let move = emptyIndices[0];
    for (let i = 0; i < 9; i++) {
      if (currentBoard[i] === null) {
        currentBoard[i] = "O";
        const score = minimax(currentBoard, 0, false);
        currentBoard[i] = null;
        if (score > bestScore) {
          bestScore = score;
          move = i;
        }
      }
    }
    return move;
  }

  return emptyIndices[0];
};

export default function TicTacToeGame({ title }: { title: string }) {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState<boolean>(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [containerWidth, setContainerWidth] = useState(360);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setIsPlayerTurn(true);
  };

  const handlePlay = (index: number) => {
    if (board[index] || winner || !isPlayerTurn) return;
    const newBoard = [...board];
    newBoard[index] = "X";
    setBoard(newBoard);
    setWinner(checkWinner(newBoard));
    setIsPlayerTurn(false);
  };

  useEffect(() => {
    if (!isPlayerTurn && !winner) {
      const timer = setTimeout(() => {
        const aiMoveIdx = getAIMove([...board], difficulty);
        if (aiMoveIdx !== -1) {
          const newBoard = [...board];
          newBoard[aiMoveIdx] = "O";
          setBoard(newBoard);
          setWinner(checkWinner(newBoard));
          setIsPlayerTurn(true);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [board, isPlayerTurn, winner, difficulty]);

  const cellPx = Math.min(120, Math.floor(containerWidth * 0.72 / 3));
  const cellFs = Math.round(cellPx * 0.45);

  return (
    <div ref={containerRef} className={styles.gameInner}>
      <h3 className={styles.gameTitle}>{title}</h3>
      <div className={styles.difficultySelector}>
        <span className={styles.difficultyLabel}>Difficulty:</span>
        {(["Easy", "Medium", "Hard"] as const).map((level) => (
          <button
            key={level}
            className={`${styles.diffBtn} ${difficulty === level ? styles.activeDiff : ''}`}
            onClick={() => {
              setDifficulty(level);
              resetGame();
            }}
          >
            {level}
          </button>
        ))}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(3, ${cellPx}px)`,
        gap: 8,
        background: "var(--border-color)",
        padding: 8,
        borderRadius: "var(--radius-md)",
        marginBottom: "1.5rem",
      }}>
        {board.map((cell, idx) => (
          <button
            key={idx}
            onClick={() => handlePlay(idx)}
            disabled={cell !== null || !isPlayerTurn || winner !== null}
            style={{
              width: cellPx, height: cellPx,
              background: "var(--bg-primary)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontSize: cellFs,
              fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: cell !== null || !isPlayerTurn || winner !== null ? "not-allowed" : "pointer",
              transition: "background var(--transition-fast)",
              color: cell === "X" ? "var(--accent-secondary)" : cell === "O" ? "var(--accent-primary)" : undefined,
            }}
          >
            {cell}
          </button>
        ))}
      </div>

      <div className={styles.gameControls}>
        <div className={styles.status}>
          {winner ? (winner === "Draw" ? "It's a draw!" : `Winner: ${winner}`) : (isPlayerTurn ? "Your turn" : "AI is thinking...")}
        </div>
        <button className={styles.resetBtn} onClick={resetGame}>Restart Game</button>
      </div>
    </div>
  );
}
