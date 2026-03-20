import React from "react";
import styles from "./page.module.css";
import gamesData from "@/data/games.json";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Game } from "@/types/game";
import TicTacToeGame from "@/components/games/TicTacToeGame";
import AICanvasGame from "@/components/games/AICanvasGame";
import StampPadGame from "@/components/games/StampPadGame";
import PixelArtGame from "@/components/games/PixelArtGame";
import FireworksGame from "@/components/games/FireworksGame";
import EndlessRunnerGame from "@/components/games/EndlessRunnerGame";
import QueenGauntletGame from "@/components/games/QueenGauntletGame";
import MazeGame from "@/components/games/MazeGame";
import NatureMazeGame from "@/components/games/NatureMazeGame";
import AnagramBlitzGame from "@/components/games/AnagramBlitzGame";
import WordLadderGame from "@/components/games/WordLadderGame";
import GhostGame from "@/components/games/GhostGame";
import WhackAMoleGame from "@/components/games/WhackAMoleGame";
import FruitCatcherGame from "@/components/games/FruitCatcherGame";
import BubblePopGame from "@/components/games/BubblePopGame";
import ErrorBoundary from "@/components/ErrorBoundary";

const GAME_COMPONENTS: Record<string, React.ComponentType<{ title: string }>> = {
  'tic-tac-toe': TicTacToeGame,
  'ai-canvas': AICanvasGame,
  'stamp-pad': StampPadGame,
  'pixel-art': PixelArtGame,
  'fireworks-canvas': FireworksGame,
  'endless-runner': EndlessRunnerGame,
  'queen-gauntlet': QueenGauntletGame,
  'maze-game': MazeGame,
  'forest-maze': NatureMazeGame,
  'anagram-blitz': AnagramBlitzGame,
  'word-ladder': WordLadderGame,
  'ghost': GhostGame,
  'whack-a-mole': WhackAMoleGame,
  'fruit-catcher': FruitCatcherGame,
  'bubble-pop': BubblePopGame,
};

export default function GamePage({ params }: { params: { id: string } }) {
  const game = (gamesData as Game[]).find(g => g.id === params.id);

  if (!game) {
    notFound();
  }

  const GameComponent = GAME_COMPONENTS[game.id];

  return (
    <div className={styles.container}>
      <Link href="/explore" className={styles.backLink}>
        &larr; Back to Explore
      </Link>

      <div className={styles.gameLayout}>
        <div className={styles.mainContent}>
          <div className={styles.gameWrapper}>
            <div className={styles.gameContainer}>
              {GameComponent ? (
                <ErrorBoundary>
                  <GameComponent title={game.title} />
                </ErrorBoundary>
              ) : (
                <p style={{ color: 'var(--text-secondary)', padding: '2rem' }}>Game not found.</p>
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
