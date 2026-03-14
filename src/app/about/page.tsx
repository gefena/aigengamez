import Link from 'next/link';

export default function AboutPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '6rem 2rem', textAlign: 'center' }}>
      <h1 className="gradient-text" style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>About aigengamez</h1>
      <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', lineHeight: '1.8', marginBottom: '2rem' }}>
        aigengamez is an experimental platform built to showcase the future of interactive entertainment. 
        We believe that artificial intelligence will revolutionize how games are created, played, and experienced. 
        Our mission is to collect and develop the best AI-powered mini-games for you to enjoy directly in your browser.
      </p>
      <Link href="/explore" style={{ display: 'inline-block', background: 'var(--accent-gradient)', color: 'white', padding: '0.75rem 2rem', borderRadius: 'var(--radius-full)', fontWeight: '600', textDecoration: 'none' }}>
        Start Playing
      </Link>
    </div>
  );
}
