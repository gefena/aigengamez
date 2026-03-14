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

  const colors = [
    // Reds / pinks
    "#ff3366", "#ff6b6b", "#ff9a9e",
    // Oranges
    "#ff6b2b", "#ffaa33",
    // Yellows
    "#ffcc00", "#f9f871",
    // Greens
    "#33ff99", "#00c896", "#4caf50",
    // Blues
    "#33ccff", "#2196f3", "#1565c0",
    // Purples / violets
    "#9933ff", "#ce93d8", "#7c4dff",
    // Neutrals
    "#ffffff", "#aaaaaa", "#555555", "#000000",
  ];

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
      <div style={{ display: 'flex', gap: '0.75rem', background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', alignItems: 'center', flexWrap: 'wrap', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginRight: '0.25rem' }}>Color</span>
          {colors.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: '24px', height: '24px', borderRadius: '50%', backgroundColor: c, border: color === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer', boxShadow: color === c ? '0 0 8px rgba(255,255,255,0.6)' : 'none', flexShrink: 0
              }}
            />
          ))}
          {/* Custom colour picker */}
          <label
            title="Custom colour"
            style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
              border: '2px solid transparent', cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              boxShadow: !colors.includes(color) ? '0 0 8px rgba(255,255,255,0.6)' : 'none',
              outline: !colors.includes(color) ? '2px solid white' : 'none',
            }}
          >
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }}
            />
          </label>
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
      <div style={{ flex: 1, alignSelf: 'stretch', background: 'white', borderRadius: 'var(--radius-md)', overflow: 'hidden', cursor: 'crosshair', border: '1px solid var(--border-color)' }}>
        <canvas ref={canvasRef} id="aiCanvas" style={{ width: '100%', height: '100%', touchAction: 'none', display: 'block' }} />
      </div>
    </div>
  );
}


// ─── Stamp & Sticker Pad ────────────────────────────────────────────────────
const STAMP_CATEGORIES: Record<string, string[]> = {
  Animals:  ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐸','🐙','🦋','🐝'],
  Food:     ['🍕','🍔','🌮','🍣','🍩','🎂','🍦','🍓','🍉','🍋','🥝','🥑','🍟','🧁','🍪'],
  Space:    ['🚀','🌍','🌙','⭐','🌟','💫','☄️','🪐','👽','🛸','🌌','🔭','🌠','🌞','🪨'],
  Fun:      ['🎉','🎈','🎁','🎮','🎨','🎵','🏆','❤️','😂','🤩','🦄','🌈','💎','🔥','✨'],
};
const BG_COLORS = ['#fff9f0','#f0fff4','#f0f4ff','#fff0f0','#f5f0ff','#fffde7'];

function StampPadGame({ title }: { title: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [category, setCategory] = useState<string>('Animals');
  const [selectedStamp, setSelectedStamp] = useState<string>('🐶');
  const [bgColor, setBgColor] = useState<string>(BG_COLORS[0]);
  const [stampSize, setStampSize] = useState<number>(48);

  // Fill background when bgColor changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (canvas.width === 0) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width || 600;
      canvas.height = rect.height || 400;
    }
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [bgColor]);

  // Size canvas on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 600;
    canvas.height = rect.height || 400;
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.fillStyle = bgColor; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const placeStamp = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    ctx.font = `${stampSize * scaleX}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(selectedStamp, x, y);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.fillStyle = bgColor; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  };

  return (
    <div className={styles.gameInner} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: '0.75rem', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 className={styles.gameTitle} style={{ margin: 0 }}>{title}</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {BG_COLORS.map(c => (
            <button key={c} onClick={() => setBgColor(c)} title="Background colour" style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: bgColor === c ? '2px solid var(--accent-primary)' : '2px solid var(--border-color)', cursor: 'pointer' }} />
          ))}
          <select
            value={stampSize}
            onChange={e => setStampSize(Number(e.target.value))}
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            {[32, 48, 72, 96].map(s => <option key={s} value={s}>{s}px</option>)}
          </select>
          <button onClick={clearCanvas} style={{ padding: '0.35rem 0.9rem', background: 'rgba(255,50,50,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,50,50,0.4)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Clear</button>
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {Object.keys(STAMP_CATEGORIES).map(cat => (
          <button key={cat} onClick={() => { setCategory(cat); setSelectedStamp(STAMP_CATEGORIES[cat][0]); }}
            style={{ padding: '0.3rem 0.8rem', borderRadius: 'var(--radius-full)', border: 'none', background: category === cat ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)', color: category === cat ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
          >{cat}</button>
        ))}
      </div>

      {/* Stamp picker */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', background: 'var(--bg-secondary)', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
        {STAMP_CATEGORIES[category].map(emoji => (
          <button key={emoji} onClick={() => setSelectedStamp(emoji)}
            style={{ fontSize: '1.4rem', padding: '0.2rem 0.3rem', borderRadius: 'var(--radius-sm)', border: selectedStamp === emoji ? '2px solid var(--accent-primary)' : '2px solid transparent', background: selectedStamp === emoji ? 'rgba(255,255,255,0.1)' : 'transparent', cursor: 'pointer', lineHeight: 1 }}
          >{emoji}</button>
        ))}
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        <canvas
          ref={canvasRef}
          onClick={placeStamp}
          onTouchStart={placeStamp}
          style={{ width: '100%', height: '100%', display: 'block', cursor: 'cell', touchAction: 'none' }}
        />
      </div>
    </div>
  );
}

// ─── Pixel Art Maker ────────────────────────────────────────────────────────
const GRID = 32;
const PIXEL_PALETTE = [
  '#000000','#ffffff','#ff3366','#ff6b6b','#ff9a9e','#ff6b2b','#ffaa33','#ffcc00',
  '#f9f871','#33ff99','#00c896','#4caf50','#33ccff','#2196f3','#1565c0',
  '#9933ff','#ce93d8','#7c4dff','#aaaaaa','#555555',
];

function PixelArtGame({ title }: { title: string }) {
  const [pixels, setPixels] = useState<string[]>(() => Array(GRID * GRID).fill('#ffffff'));
  const [activeColor, setActiveColor] = useState<string>('#000000');
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const isPainting = useRef<boolean>(false);

  const paint = (idx: number) => {
    setPixels(prev => {
      const next = [...prev];
      next[idx] = isEraser ? '#ffffff' : activeColor;
      return next;
    });
  };

  const downloadImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = GRID;
    canvas.height = GRID;
    const ctx = canvas.getContext('2d')!;
    pixels.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(i % GRID, Math.floor(i / GRID), 1, 1);
    });
    const link = document.createElement('a');
    link.download = 'pixel-art.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const cellSize = `${100 / GRID}%`;

  return (
    <div className={styles.gameInner} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: '0.75rem', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 className={styles.gameTitle} style={{ margin: 0 }}>{title}</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setIsEraser(!isEraser)}
            style={{ padding: '0.35rem 0.9rem', borderRadius: 'var(--radius-full)', border: 'none', background: isEraser ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
          >🧹 {isEraser ? 'Eraser ON' : 'Eraser'}</button>
          <button onClick={() => setPixels(Array(GRID * GRID).fill('#ffffff'))}
            style={{ padding: '0.35rem 0.9rem', background: 'rgba(255,50,50,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,50,50,0.4)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Clear</button>
          <button onClick={downloadImage}
            style={{ padding: '0.35rem 0.9rem', background: 'rgba(30,200,100,0.15)', color: '#33ff99', border: '1px solid rgba(30,200,100,0.4)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>↓ Save</button>
        </div>
      </div>

      {/* Palette */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', background: 'var(--bg-secondary)', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', alignItems: 'center' }}>
        {PIXEL_PALETTE.map(c => (
          <button key={c} onClick={() => { setActiveColor(c); setIsEraser(false); }}
            style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: (!isEraser && activeColor === c) ? '3px solid white' : '2px solid transparent', cursor: 'pointer', boxShadow: (!isEraser && activeColor === c) ? '0 0 8px rgba(255,255,255,0.6)' : 'none', flexShrink: 0 }}
          />
        ))}
        <label title="Custom" style={{ width: 26, height: 26, borderRadius: '50%', background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)', border: '2px solid transparent', cursor: 'pointer', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <input type="color" value={activeColor} onChange={e => { setActiveColor(e.target.value); setIsEraser(false); }} style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }} />
        </label>
      </div>

      {/* Grid */}
      <div
        style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${GRID}, ${cellSize})`, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', userSelect: 'none', touchAction: 'none' }}
        onMouseLeave={() => { isPainting.current = false; }}
      >
        {pixels.map((c, i) => (
          <div
            key={i}
            style={{ backgroundColor: c, aspectRatio: '1', borderRight: '1px solid rgba(0,0,0,0.05)', borderBottom: '1px solid rgba(0,0,0,0.05)', cursor: 'crosshair' }}
            onMouseDown={() => { isPainting.current = true; paint(i); }}
            onMouseUp={() => { isPainting.current = false; }}
            onMouseEnter={() => { if (isPainting.current) paint(i); }}
            onTouchStart={(e) => { e.preventDefault(); isPainting.current = true; paint(i); }}
            onTouchEnd={() => { isPainting.current = false; }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Fireworks Canvas ───────────────────────────────────────────────────────
type Particle = { x: number; y: number; vx: number; vy: number; alpha: number; color: string; radius: number; };

function FireworksGame({ title }: { title: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  const FIREWORK_COLORS = [
    '#ff3366','#ff6b2b','#ffcc00','#33ff99','#33ccff','#9933ff','#ff9a9e','#f9f871','#ce93d8'
  ];

  const spawnBurst = (x: number, y: number) => {
    const count = 60 + Math.floor(Math.random() * 40);
    const baseColor = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 5;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color: Math.random() < 0.2 ? FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)] : baseColor,
        radius: 2 + Math.random() * 3,
      });
    }
  };

  const getCoords = (e: MouseEvent | TouchEvent, rect: DOMRect, canvas: HTMLCanvasElement) => {
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 600;
    canvas.height = rect.height || 400;
    const ctx = canvas.getContext('2d')!;

    const loop = () => {
      ctx.fillStyle = 'rgba(10,10,20,0.18)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter(p => p.alpha > 0.02);
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.07; // gravity
        p.vx *= 0.98;
        p.alpha -= 0.018;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(loop);
    };
    // Dark background
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    animRef.current = requestAnimationFrame(loop);

    const handleDown = (e: MouseEvent | TouchEvent) => {
      isDragging.current = true;
      const r = canvas.getBoundingClientRect();
      const { x, y } = getCoords(e, r, canvas);
      spawnBurst(x, y);
    };
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      if (Math.random() < 0.3) {
        const r = canvas.getBoundingClientRect();
        const { x, y } = getCoords(e, r, canvas);
        spawnBurst(x, y);
      }
    };
    const handleUp = () => { isDragging.current = false; };

    canvas.addEventListener('mousedown', handleDown);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleUp);
    canvas.addEventListener('touchstart', handleDown, { passive: false });
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    canvas.addEventListener('touchend', handleUp);

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener('mousedown', handleDown);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseup', handleUp);
      canvas.removeEventListener('touchstart', handleDown);
      canvas.removeEventListener('touchmove', handleMove);
      canvas.removeEventListener('touchend', handleUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.gameInner} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: '0.75rem', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 className={styles.gameTitle} style={{ margin: 0 }}>{title}</h3>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Click or drag to launch 🎆</span>
      </div>
      <div style={{ flex: 1, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair', touchAction: 'none' }} />
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
              ) : game.id === 'stamp-pad' ? (
                <StampPadGame title={game.title} />
              ) : game.id === 'pixel-art' ? (
                <PixelArtGame title={game.title} />
              ) : game.id === 'fireworks-canvas' ? (
                <FireworksGame title={game.title} />
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
