import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <Link href="/" className={styles.logo}>
            <span className="gradient-text">AI</span> Arcade
          </Link>
          <p className={styles.tagline}>
            Explore, search, and play the latest AI-generated games directly in your browser.
          </p>
        </div>
        
        <div className={styles.linksSection}>
          <div className={styles.linkGroup}>
            <h4 className={styles.linkGroupTitle}>Platform</h4>
            <Link href="/explore" className={styles.link}>Explore Games</Link>
            <Link href="/categories" className={styles.link}>Categories</Link>
            <Link href="/new" className={styles.link}>New Releases</Link>
          </div>
          <div className={styles.linkGroup}>
            <h4 className={styles.linkGroupTitle}>Company</h4>
            <Link href="/about" className={styles.link}>About Us</Link>
            <Link href="/contact" className={styles.link}>Contact</Link>
            <Link href="/privacy" className={styles.link}>Privacy Policy</Link>
          </div>
        </div>
      </div>
      
      <div className={styles.bottomBar}>
        <p>&copy; {new Date().getFullYear()} aigengamez. All rights reserved.</p>
      </div>
    </footer>
  );
}
