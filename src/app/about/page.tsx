"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "6rem 2rem", textAlign: "center" }}>
      <h1 className="gradient-text" style={{ fontSize: "3rem", marginBottom: "1.5rem" }}>
        {t.about.title}
      </h1>
      <p style={{ fontSize: "1.2rem", color: "var(--text-secondary)", lineHeight: "1.8", marginBottom: "2rem" }}>
        {t.about.body}
      </p>
      <Link
        href="/explore"
        style={{
          display: "inline-block",
          background: "var(--accent-gradient)",
          color: "white",
          padding: "0.75rem 2rem",
          borderRadius: "var(--radius-full)",
          fontWeight: "600",
          textDecoration: "none",
        }}
      >
        {t.about.startPlaying}
      </Link>
    </div>
  );
}
