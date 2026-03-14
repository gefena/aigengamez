import Link from "next/link";
import styles from "./Navbar.module.css";

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        <Link href="/" className={styles.logo}>
          <span className="gradient-text">aigen</span>gamez
        </Link>
        
        <div className={styles.navLinks}>
          <Link href="/explore" className={styles.navLink}>
            Explore
          </Link>
          <Link href="/about" className={styles.navLink}>
            About
          </Link>
          <button className={styles.loginBtn}>Sign In</button>
        </div>
      </div>
    </nav>
  );
}
