"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        <Link href="/" className={styles.logo}>
          <span className="gradient-text">aigen</span>gamez
        </Link>

        <div className={styles.navLinks}>
          <Link href="/explore" className={styles.navLink}>Explore</Link>
          <Link href="/about" className={styles.navLink}>About</Link>
        </div>

        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span className={`${styles.bar} ${menuOpen ? styles.barOpen1 : ''}`} />
          <span className={`${styles.bar} ${menuOpen ? styles.barOpen2 : ''}`} />
          <span className={`${styles.bar} ${menuOpen ? styles.barOpen3 : ''}`} />
        </button>
      </div>

      {menuOpen && (
        <div className={styles.mobileMenu}>
          <Link href="/explore" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Explore</Link>
          <Link href="/about" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>About</Link>
        </div>
      )}
    </nav>
  );
}
