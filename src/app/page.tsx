"use client";

import Link from "next/link";
import styles from "./page.module.css";
import GameCard from "@/components/GameCard";
import gamesData from "@/data/games.json";
import type { Game } from "@/types/game";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Home() {
  const { t, lang } = useLanguage();
  const games = gamesData as Game[];

  const localizedGames = games.map((g) => ({
    ...g,
    title: t.games[g.id]?.title ?? g.title,
    description: t.games[g.id]?.description ?? g.description,
  }));

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>{t.home.badge}</div>
          <h1 className={styles.title}>
            {t.home.title} <br />
            <span className="gradient-text">{t.home.titleAccent}</span>
          </h1>
          <p className={styles.subtitle}>{t.home.subtitle}</p>
          <div className={styles.actions}>
            <Link href="/explore" className={styles.primaryBtn}>
              {t.home.exploreBtn}
            </Link>
            <Link href="/about" className={styles.secondaryBtn}>
              {t.home.howItWorks}
            </Link>
          </div>
        </div>

        <div className={styles.heroBackground}>
          <div className={styles.glowBlob1}></div>
          <div className={styles.glowBlob2}></div>
        </div>
      </section>

      {/* Featured Games Section */}
      <section className={styles.featured}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t.home.featuredTitle}</h2>
          <Link href="/explore" className={styles.viewAll}>
            {t.home.viewAll} {lang === "he" ? "←" : "→"}
          </Link>
        </div>

        <div className={styles.grid}>
          {localizedGames.map((game) => (
            <GameCard key={game.id} {...game} />
          ))}
        </div>
      </section>

      {/* Call to Action Section */}
      <section className={styles.cta}>
        <div className={`glass-panel ${styles.ctaContent}`}>
          <h2 className={styles.ctaTitle}>{t.home.ctaTitle}</h2>
          <p className={styles.ctaDesc}>{t.home.ctaDesc}</p>
          <button className={styles.primaryBtn}>{t.home.playFree}</button>
        </div>
      </section>
    </div>
  );
}
