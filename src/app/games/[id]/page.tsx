"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import gamesData from "@/data/games.json";
import Link from "next/link";
import { notFound } from "next/navigation";

// A complete Tic-Tac-Toe AI game
function TicTacToeGame({ title, category }: { title: string, category: string }) {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState<boolean>(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");

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
          squares[i] = "O"; // AI is Maximizing (O)
          let score = minimax(squares, depth + 1, false);
          squares[i] = null;
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
          squares[i] = "X"; // Player is Minimizing (X)
          let score = minimax(squares, depth + 1, true);
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
          let score = minimax(currentBoard, 0, false);
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

  useEffect(() => {
    if (!isPlayerTurn && !winner) {
      const timer = setTimeout(() => {
        const aiMoveIdx = getAIMove([...board], difficulty);
        if (aiMoveIdx !== -1) {
          const newBoard = [...board];
          newBoard[aiMoveIdx] = "O"; // AI is O
          setBoard(newBoard);
          setWinner(checkWinner(newBoard));
          setIsPlayerTurn(true);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [board, isPlayerTurn, winner, difficulty]);

  const handlePlay = (index: number) => {
    if (board[index] || winner || !isPlayerTurn) return;
    const newBoard = [...board];
    newBoard[index] = "X"; // Player is X
    setBoard(newBoard);
    setWinner(checkWinner(newBoard));
    setIsPlayerTurn(false);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setIsPlayerTurn(true);
  };

  return (
    <div className={styles.gameInner}>
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
      
      <div className={styles.board}>
        {board.map((cell, idx) => (
          <button 
            key={idx} 
            className={`${styles.cell} ${cell ? (cell === 'X' ? styles.cellX : styles.cellO) : ''}`}
            onClick={() => handlePlay(idx)}
            disabled={cell !== null || !isPlayerTurn || winner !== null}
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

function ComingSoonGame({ title }: { title: string }) {
  return (
    <div className={styles.gameInner} style={{ textAlign: 'center' }}>
      <h3 className={styles.gameTitle}>{title}</h3>
      <div style={{ padding: '3rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-lg)', marginTop: '2rem', border: '1px solid var(--border-highlight)' }}>
        <h4 style={{ fontSize: '1.5rem', color: 'var(--accent-primary)', marginBottom: '1rem' }}>Coming Soon</h4>
        <p style={{ color: 'var(--text-secondary)' }}>The AI model for this game is currently training in the cloud.<br/>Check back soon!</p>
      </div>
    </div>
  );
}

export default function GamePage({ params }: { params: { id: string } }) {
  const game = gamesData.find(g => g.id === params.id);

  if (!game) {
    notFound();
  }

  return (
    <div className={styles.container}>
      <Link href="/explore" className={styles.backLink}>
        &larr; Back to Explore
      </Link>
      
      <div className={styles.gameLayout}>
        <div className={styles.mainContent}>
          <div className={styles.gameWrapper}>
            {/* The actual Game Container */}
            <div className={styles.gameContainer}>
              {game.id === 'tic-tac-toe' ? (
                <TicTacToeGame title={game.title} category={game.category} />
              ) : (
                <ComingSoonGame title={game.title} />
              )}
            </div>
            
            <div className={styles.gameDetails}>
              <div className={styles.gameHeader}>
                <h1 className={styles.title}>{game.title}</h1>
                <div className={styles.rating}>★ {game.rating.toFixed(1)}</div>
              </div>
              <p className={styles.developer}>By {game.developer} • {game.category}</p>
              <p className={styles.description}>{game.description}</p>
            </div>
          </div>
        </div>
        
        <div className={styles.sidebar}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Game Info</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-secondary)' }}>
              <li><strong>Controls:</strong> Mouse / Touch</li>
              <li><strong>Type:</strong> Single Player</li>
              <li><strong>AI Model:</strong> Placeholder v1.0</li>
              <li><strong>Status:</strong> Beta Prototype</li>
            </ul>
            <button className={styles.shareBtn}>Share Game</button>
          </div>
        </div>
      </div>
    </div>
  );
}
