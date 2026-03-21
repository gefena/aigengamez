"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import GameCard from "@/components/GameCard";
import gamesData from "@/data/games.json";

const CATEGORIES = ["All", "Action", "Puzzle", "Kids", "Strategy", "Racing", "Simulation"];

const KIDS_IDS = [
  'ai-canvas', 'stamp-pad', 'pixel-art', 'fireworks-canvas',
  'maze-game', 'forest-maze', 'memory-match', 'fruit-catcher',
  'bubble-pop', 'anagram-blitz', 'trivia', 'code-order',
  'whack-a-mole', 'four-in-a-row', 'lawn-mower', 'fart-duel',
];
const ALL_IDS = gamesData.map(g => g.id);

export default function ExplorePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const handleSurprise = (audience: 'kids' | 'adult') => {
    const pool = audience === 'kids' ? KIDS_IDS : ALL_IDS;
    const id = pool[Math.floor(Math.random() * pool.length)];
    router.push(`/games/${id}`);
  };

  const filteredGames = gamesData.filter((game) => {
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          game.developer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || game.category === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className={styles.container}>
      {/* Header and Search */}
      <section className={styles.header}>
        <h1 className={styles.title}>Explore Games</h1>
        <p className={styles.subtitle}>Discover the best AI-powered games hand-picked for you.</p>
        
        <div className={styles.searchBar}>
          <input 
            type="text" 
            placeholder="Search for games or developers..." 
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
          <h3>Surprise Me!</h3>
          <p>Pick your vibe and we&apos;ll send you somewhere fun</p>
          <div className={styles.surpriseBtns}>
            <button onClick={() => handleSurprise('kids')} className={styles.kidsBtn}>🧒 Kids</button>
            <button onClick={() => handleSurprise('adult')} className={styles.adultBtn}>🧑 Adult</button>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className={styles.filters}>
        <div className={styles.categoryList}>
          {CATEGORIES.map(category => (
            <button 
              key={category} 
              className={`${styles.categoryFilter} ${activeCategory === category ? styles.activeFilter : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {/* Games Grid */}
      <section className={styles.results}>
        {filteredGames.length > 0 ? (
          <div className={styles.grid}>
            {filteredGames.map((game) => (
              <GameCard key={game.id} {...game} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎮</div>
            <h3>No games found</h3>
            <p>Try adjusting your search criteria or category filter.</p>
            <button className={styles.resetBtn} onClick={() => { setSearchQuery(""); setActiveCategory("All"); }}>
              Reset Filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
