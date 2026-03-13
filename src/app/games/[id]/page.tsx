"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import gamesData from "@/data/games.json";
import Link from "next/link";
import { notFound } from "next/navigation";

// A simple AI game component (Tic Tac Toe vs Random AI)
function SimpleAIGame({ title, category }: { title: string, category: string }) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isPlayerTurn && !winner) {
      const timer = setTimeout(() => {
        const emptyIndices = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null) as number[];
        if (emptyIndices.length > 0) {
          const randomIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
          const newBoard = [...board];
          newBoard[randomIdx] = "O"; // AI is O
          setBoard(newBoard);
          setWinner(checkWinner(newBoard));
          setIsPlayerTurn(true);
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [board, isPlayerTurn, winner]);

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
      <h3 className={styles.gameTitle}>{title} - Interactive Prototype</h3>
      <p className={styles.gameDesc}>Category: {category} | Play as X against the AI (O)</p>
      
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
              <SimpleAIGame title={game.title} category={game.category} />
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
