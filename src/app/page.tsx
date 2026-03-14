import Link from "next/link";
import styles from "./page.module.css";
import GameCard from "@/components/GameCard";
import gamesData from "@/data/games.json";
import type { Game } from "@/types/game";

const FEATURED_GAMES = gamesData as Game[];

export default function Home() {
  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>Next-Gen AI Gaming</div>
          <h1 className={styles.title}>
            The Future of Play is <br />
            <span className="gradient-text">Here and Now</span>
          </h1>
          <p className={styles.subtitle}>
            Experience games crafted, adapted, and powered by artificial intelligence.
            No downloads required. Play instantly in your browser on any device.
          </p>
          <div className={styles.actions}>
            <Link href="/explore" className={styles.primaryBtn}>
              Explore Games
            </Link>
            <Link href="/about" className={styles.secondaryBtn}>
              How it Works
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
          <h2 className={styles.sectionTitle}>Featured Games</h2>
          <Link href="/explore" className={styles.viewAll}>
            View All &rarr;
          </Link>
        </div>

        <div className={styles.grid}>
          {FEATURED_GAMES.map((game) => (
            <GameCard key={game.id} {...game} />
          ))}
        </div>
      </section>

      {/* Call to Action Section */}
      <section className={styles.cta}>
        <div className={`glass-panel ${styles.ctaContent}`}>
          <h2 className={styles.ctaTitle}>Ready to Enter the Arena?</h2>
          <p className={styles.ctaDesc}>Join thousands of players in the next generation of adaptive gaming.</p>
          <button className={styles.primaryBtn}>Play Now for Free</button>
        </div>
      </section>
    </div>
  );
}
