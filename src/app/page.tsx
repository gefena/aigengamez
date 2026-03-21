"use client";

import Link from "next/link";
import styles from "./page.module.css";
import GameCard from "@/components/GameCard";
import gamesData from "@/data/games.json";
import type { Game } from "@/types/game";
import { useLanguage } from "@/contexts/LanguageContext";

const FEATURED_IDS = [
  "queen-gauntlet",
  "anagram-blitz",
  "four-in-a-row",
  "forest-maze",
  "mandala-painter",
  "money-market",
  "trivia",
  "endless-runner",
];

const MARQUEE_TEXT =
  "Queen's Gauntlet · Anagram Blitz · Forest Escape · Toilet Piano · Kaleidoscope Painter · Marble Drop · Socks Match · Color by Numbers · Mandala Painter · Number Rocket · Shape Sorter · Estimation Station · Money Market · 4 in a Row · Ghost · Word Ladder · Math Blitz · Bubble Pop · ";

const STATS = [
  { icon: "🎮", label: "39 Games" },
  { icon: "🆓", label: "Always Free" },
  { icon: "📱", label: "No Download" },
  { icon: "🌍", label: "EN + HE" },
];

const FLOATERS = ["♛", "🚀", "🌸", "🎯", "🔤", "🎨", "🧩", "⚡"];

export default function Home() {
  const { t, lang } = useLanguage();
  const games = gamesData as Game[];

  const allLocalized = games.map((g) => ({
    ...g,
    title: t.games[g.id]?.title ?? g.title,
    description: t.games[g.id]?.description ?? g.description,
  }));

  const featuredGames = FEATURED_IDS
    .map((id) => allLocalized.find((g) => g.id === id))
    .filter(Boolean) as typeof allLocalized;

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

          {/* Stats bar */}
          <div className={styles.statsBar}>
            {STATS.map((s) => (
              <div key={s.label} className={styles.statItem}>
                <span className={styles.statIcon}>{s.icon}</span>
                <span className={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.heroBackground}>
          <div className={styles.glowBlob1}></div>
          <div className={styles.glowBlob2}></div>
          {FLOATERS.map((emoji, i) => (
            <div key={i} className={styles[`floater${i + 1}` as keyof typeof styles]}>{emoji}</div>
          ))}
        </div>
      </section>

      {/* Marquee strip */}
      <div className={styles.marqueeStrip}>
        <div className={styles.marqueeTrack}>
          <span>{MARQUEE_TEXT}</span>
          <span aria-hidden="true">{MARQUEE_TEXT}</span>
        </div>
      </div>

      {/* Featured Games Section */}
      <section className={styles.featured}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t.home.featuredTitle}</h2>
          <Link href="/explore" className={styles.viewAll}>
            {t.home.viewAll} {lang === "he" ? "←" : "→"}
          </Link>
        </div>

        <div className={styles.grid}>
          {featuredGames.map((game) => (
            <GameCard key={game.id} {...game} description={game.description} />
          ))}
        </div>

        <div className={styles.browseAll}>
          <Link href="/explore" className={styles.browseAllLink}>
            Browse all 39 games {lang === "he" ? "←" : "→"}
          </Link>
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
