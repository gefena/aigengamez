"use client";

import { useState } from "react";
import styles from "./page.module.css";
import GameCard from "@/components/GameCard";
import gamesData from "@/data/games.json";

const CATEGORIES = ["All", "Action", "Strategy", "Racing", "Simulation", "Puzzle"];

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

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
