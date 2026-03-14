import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '6rem 2rem', textAlign: 'left' }}>
      <h1 className="gradient-text" style={{ fontSize: '3rem', marginBottom: '1.5rem', textAlign: 'center' }}>Privacy Policy</h1>
      <div style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
        <p style={{ marginBottom: '1rem' }}>Last updated: {new Date().toLocaleDateString()}</p>
        <h2 style={{ color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>1. Information We Collect</h2>
        <p style={{ marginBottom: '1rem' }}>We do not actively collect personal data. This is a prototype platform for AI games. Any data processed by the games remains local to your browser session unless explicitly stated otherwise.</p>
        <h2 style={{ color: 'var(--text-primary)', marginTop: '2rem', marginBottom: '1rem' }}>2. Use of Cookies</h2>
        <p style={{ marginBottom: '1rem' }}>We use minimal cookies strictly necessary for the operation of the site, such as maintaining state for gameplay. We do not use third-party tracking cookies.</p>
        <div style={{ textAlign: 'center', marginTop: '4rem' }}>
          <Link href="/" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: '500' }}>
            &larr; Back Home
          </Link>
        </div>
      </div>
    </div>
  );
}
