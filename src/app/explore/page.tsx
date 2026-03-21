"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import GameCard from "@/components/GameCard";
import gamesData from "@/data/games.json";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAllPlayCounts } from "@/lib/playCounts";
import type { Game } from "@/types/game";

const TAGS = ["All", "Math", "Word", "Art", "Logic", "Coding", "Action", "Memory", "STEM", "Maze", "Music", "Hebrew"];

// Kids pool: all games that don't require adult reasoning (exclude pure STEM/Coding for kids Surprise Me)
const KIDS_TAGS = ["Math", "Art", "Action", "Memory", "Maze", "Music", "Word"];
const ALL_IDS = (gamesData as import("@/types/game").Game[]).map((g) => g.id);
const KIDS_IDS = (gamesData as import("@/types/game").Game[])
  .filter((g) => g.tags?.some((tag) => KIDS_TAGS.includes(tag)))
  .map((g) => g.id);

export default function ExplorePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    setPlayCounts(getAllPlayCounts());
  }, []);

  const handleSurprise = (audience: "kids" | "adult") => {
    const pool = audience === "kids" ? KIDS_IDS : ALL_IDS;
    const id = pool[Math.floor(Math.random() * pool.length)];
    router.push(`/games/${id}`);
  };

  const games = (gamesData as Game[]).map((g) => ({
    ...g,
    title: t.games[g.id]?.title ?? g.title,
    description: t.games[g.id]?.description ?? g.description,
  }));

  const filteredGames = games.filter((game) => {
    const matchesSearch =
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.developer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = activeTag === "All" || game.tags?.includes(activeTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div className={styles.container}>
      {/* Header and Search */}
      <section className={styles.header}>
        <h1 className={styles.title}>{t.explore.title}</h1>
        <p className={styles.subtitle}>{t.explore.subtitle}</p>

        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder={t.explore.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          <button className={styles.searchBtn}>🔍</button>
        </div>
      </section>

      {/* Surprise Me */}
      <section className={styles.surprise}>
        <div className={styles.surpriseCard}>
          <span className={styles.surpriseDice}>🎲</span>
          <h3>{t.explore.surpriseTitle}</h3>
          <p>{t.explore.surpriseSubtitle}</p>
          <div className={styles.surpriseBtns}>
            <button onClick={() => handleSurprise("kids")} className={styles.kidsBtn}>
              🧒 {t.explore.kids}
            </button>
            <button onClick={() => handleSurprise("adult")} className={styles.adultBtn}>
              🧑 {t.explore.adult}
            </button>
          </div>
        </div>
      </section>

      {/* Tag Filter */}
      <section className={styles.filters}>
        <div className={styles.categoryList}>
          {TAGS.map((tag) => (
            <button
              key={tag}
              className={`${styles.categoryFilter} ${activeTag === tag ? styles.activeFilter : ""}`}
              onClick={() => setActiveTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      {/* Games Grid */}
      <section className={styles.results}>
        {filteredGames.length > 0 ? (
          <div className={styles.grid}>
            {filteredGames.map((game) => (
              <GameCard key={game.id} {...game} playCount={playCounts[game.id] ?? 0} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎮</div>
            <h3>{t.explore.noGames}</h3>
            <p>{t.explore.noGamesHint}</p>
            <button
              className={styles.resetBtn}
              onClick={() => { setSearchQuery(""); setActiveTag("All"); }}
            >
              {t.explore.resetFilters}
            </button>
          </div>
        )}
      </section>

    </div>
  );
}
