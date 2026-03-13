import Link from "next/link";
import styles from "./page.module.css";
import GameCard from "@/components/GameCard";

// Mock data for featured games to showcase the UI
const FEATURED_GAMES = [
  {
    id: "neural-racer",
    title: "Neural Racer X",
    developer: "AI Dynamics",
    category: "Racing",
    imageUrl: "", // Handled by fallback
    rating: 4.8,
  },
  {
    id: "quantum-chess",
    title: "Quantum Chess",
    developer: "Logic Mind",
    category: "Strategy",
    imageUrl: "",
    rating: 4.9,
  },
  {
    id: "synth-city",
    title: "Synth City Builder",
    developer: "CityAI",
    category: "Simulation",
    imageUrl: "",
    rating: 4.5,
  },
  {
    id: "void-defender",
    title: "Void Defender",
    developer: "Cosmic AI",
    category: "Action",
    imageUrl: "",
    rating: 4.7,
  }
];

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
        
        {/* Animated Hero Background Elements */}
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
