"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./page.module.css";
import gamesData from "@/data/games.json";
import Link from "next/link";
import { notFound } from "next/navigation";

// Tic-Tac-Toe Logic Helpers (moved outside to satisfy ESLint)
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

// A complete Tic-Tac-Toe AI game
function TicTacToeGame({ title }: { title: string }) {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState<boolean>(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setIsPlayerTurn(true);
  };

  const handlePlay = (index: number) => {
    if (board[index] || winner || !isPlayerTurn) return;
    const newBoard = [...board];
    newBoard[index] = "X"; // Player is X
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
          newBoard[aiMoveIdx] = "O"; // AI is O
          setBoard(newBoard);
          setWinner(checkWinner(newBoard));
          setIsPlayerTurn(true);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [board, isPlayerTurn, winner, difficulty]);

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

// AI Magic Canvas Game
function AICanvasGame({ title }: { title: string }) {
  const [color, setColor] = useState<string>("#ff3366");
  const [brushSize, setBrushSize] = useState<number>(5);
  const [isSymmetryMode, setIsSymmetryMode] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isInitialized = useRef<boolean>(false);

  // Effect 1: Initialize canvas ONCE on mount (setting dimensions wipes the canvas, so NEVER do this again)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isInitialized.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    isInitialized.current = true;
  }, []);

  // Effect 2: Re-attach event listeners whenever color/brushSize/symmetry change
  // These closures capture the latest values—no canvas sizing here
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();

      const r = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      // Scale CSS coords to canvas logical coords
      const scaleX = canvas.width / r.width;
      const scaleY = canvas.height / r.height;
      const x = (clientX - r.left) * scaleX;
      const y = (clientY - r.top) * scaleY;

      ctx.strokeStyle = color;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = brushSize;

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();

      if (isSymmetryMode) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const points = [
          { x: centerX + (centerX - x), y },
          { x, y: centerY + (centerY - y) },
          { x: centerX + (centerX - x), y: centerY + (centerY - y) }
        ];
        const lastPoints = [
          { x: centerX + (centerX - lastX), y: lastY },
          { x: lastX, y: centerY + (centerY - lastY) },
          { x: centerX + (centerX - lastX), y: centerY + (centerY - lastY) }
        ];
        points.forEach((p, i) => {
          ctx.beginPath();
          ctx.moveTo(lastPoints[i].x, lastPoints[i].y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        });
      }

      lastX = x;
      lastY = y;
    };

    const startDraw = (e: MouseEvent | TouchEvent) => {
      isDrawing = true;
      const r = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const scaleX = canvas.width / r.width;
      const scaleY = canvas.height / r.height;
      lastX = (clientX - r.left) * scaleX;
      lastY = (clientY - r.top) * scaleY;
    };

    const stopDraw = () => { isDrawing = false; };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseout', stopDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);

    return () => {
      canvas.removeEventListener('mousedown', startDraw);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDraw);
      canvas.removeEventListener('mouseout', stopDraw);
      canvas.removeEventListener('touchstart', startDraw);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDraw);
    };
  }, [color, brushSize, isSymmetryMode]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const colors = ["#ff3366", "#33ccff", "#33ff99", "#ffcc00", "#9933ff", "#ffffff", "#000000"];

  return (
    <div className={styles.gameInner} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: '1rem' }}>
      {/* Top Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 className={styles.gameTitle} style={{ margin: 0 }}>{title}</h3>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            onClick={() => setIsSymmetryMode(!isSymmetryMode)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              background: isSymmetryMode ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.1)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            ✨ AI Symmetry {isSymmetryMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Horizontal Toolbar */}
      <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginRight: '0.5rem' }}>Color</span>
          {colors.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: '28px', height: '28px', borderRadius: '50%', backgroundColor: c, border: color === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer', boxShadow: color === c ? '0 0 10px rgba(255,255,255,0.5)' : 'none'
              }}
            />
          ))}
        </div>
        
        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 0.5rem' }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginRight: '0.5rem' }}>Size</span>
          {[2, 5, 12, 24].map(size => (
            <button
              key={size}
              onClick={() => setBrushSize(size)}
              style={{
                width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', background: brushSize === size ? 'rgba(255,255,255,0.1)' : 'transparent', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer'
              }}
            >
              <div style={{ width: size > 16 ? 16 : size, height: size > 16 ? 16 : size, background: 'white', borderRadius: '50%' }} />
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />
        <button onClick={clearCanvas} style={{ padding: '0.4rem 1rem', background: 'rgba(255,50,50,0.2)', color: '#ff6b6b', border: '1px solid rgba(255,50,50,0.5)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}>
          Clear
        </button>
      </div>

      {/* Canvas Area */}
      <div style={{ flex: 1, background: 'white', borderRadius: 'var(--radius-md)', overflow: 'hidden', cursor: 'crosshair', border: '1px solid var(--border-color)', width: '100%', minHeight: '200px' }}>
        <canvas ref={canvasRef} id="aiCanvas" style={{ width: '100%', height: '100%', touchAction: 'none' }} />
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
                <TicTacToeGame title={game.title} />
              ) : game.id === 'ai-canvas' ? (
                <AICanvasGame title={game.title} />
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
