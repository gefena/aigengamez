import React from "react";
import Link from "next/link";
import styles from "./GameCard.module.css";
import type { Game } from "@/types/game";

type GameCardProps = Pick<Game, 'id' | 'title' | 'developer' | 'category' | 'emoji' | 'thumbBg'> & {
  rating?: number;
};

function GameCard({ id, title, developer, category, emoji, thumbBg, rating }: GameCardProps) {
  return (
    <Link href={`/games/${id}`} className={styles.card}>
      <div
        className={styles.imageContainer}
        style={{ background: `linear-gradient(${thumbBg})` }}
      >
        <span className={styles.thumbEmoji}>{emoji}</span>
        <div className={styles.categoryBadge}>{category}</div>
      </div>

      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          {rating && (
            <div className={styles.rating}>
              <span className={styles.star}>★</span>
              <span>{rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <p className={styles.developer}>{developer}</p>
      </div>
    </Link>
  );
}

export default React.memo(GameCard);
