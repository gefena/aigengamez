"use client";

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
import TriviaGame from "@/components/games/TriviaGame";
import CodeOrderGame from "@/components/games/CodeOrderGame";
import BugHuntGame from "@/components/games/BugHuntGame";
import LogicGatesGame from "@/components/games/LogicGatesGame";
import MemoryMatchGame from "@/components/games/MemoryMatchGame";
import FartDuelGame from "@/components/games/FartDuelGame";
import FourInARowGame from "@/components/games/FourInARowGame";
import LawnMowerGame from "@/components/games/LawnMowerGame";
import MathBlitzGame from "@/components/games/MathBlitzGame";
import BalanceScalesGame from "@/components/games/BalanceScalesGame";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useLanguage } from "@/contexts/LanguageContext";

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
  'trivia': TriviaGame,
  'code-order': CodeOrderGame,
  'bug-hunt': BugHuntGame,
  'logic-gates': LogicGatesGame,
  'memory-match': MemoryMatchGame,
  'fart-duel': FartDuelGame,
  'four-in-a-row': FourInARowGame,
  'lawn-mower': LawnMowerGame,
  'math-blitz': MathBlitzGame,
  'balance-scales': BalanceScalesGame,
};

export default function GamePage({ params }: { params: { id: string } }) {
  const { t } = useLanguage();
  const game = (gamesData as Game[]).find(g => g.id === params.id);

  if (!game) {
    notFound();
  }

  const localTitle = t.games[game.id]?.title ?? game.title;
  const localDescription = t.games[game.id]?.description ?? game.description;

  const GameComponent = GAME_COMPONENTS[game.id];

  return (
    <div className={styles.container}>
      <Link href="/explore" className={styles.backLink}>
        {t.gameDetail.back}
      </Link>

      <div className={styles.gameLayout}>
        <div className={styles.mainContent}>
          <div className={styles.gameWrapper}>
            <div className={styles.gameContainer}>
              {GameComponent ? (
                <ErrorBoundary>
                  <GameComponent title={localTitle} />
                </ErrorBoundary>
              ) : (
                <p style={{ color: 'var(--text-secondary)', padding: '2rem' }}>{t.gameDetail.notFound}</p>
              )}
            </div>

            <div className={styles.gameDetails}>
              <div className={styles.gameHeader}>
                <h1 className={styles.title}>{localTitle}</h1>
                <div className={styles.rating}>★ {game.rating.toFixed(1)}</div>
              </div>
              <p className={styles.developer}>By {game.developer} • {game.category}</p>
              <p className={styles.description}>{localDescription}</p>
            </div>
          </div>
        </div>

        <div className={styles.sidebar}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>{t.gameDetail.gameInfo}</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-secondary)' }}>
              <li><strong>{t.gameDetail.controls}:</strong> {t.gameDetail.controlsVal}</li>
              <li><strong>{t.gameDetail.type}:</strong> {t.gameDetail.typeVal}</li>
              <li><strong>{t.gameDetail.aiModel}:</strong> {t.gameDetail.aiModelVal}</li>
              <li><strong>{t.gameDetail.status}:</strong> {t.gameDetail.statusVal}</li>
            </ul>
            <button className={styles.shareBtn}>{t.gameDetail.share}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
