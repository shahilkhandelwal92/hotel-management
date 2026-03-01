import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={`container animate-fade-in ${styles.hero}`}>
        <div className={styles.heroContent}>
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'inline-block', marginBottom: '1.5rem', borderRadius: '30px' }}>
            <span style={{ color: 'var(--accent-gold)' }}>✨ Next-Gen Contactless Check-In</span>
          </div>
          <h1 className="text-gradient">Premium Hotel Management</h1>
          <p style={{ marginTop: '1.5rem', marginBottom: '2.5rem', maxWidth: '600px' }}>
            A state-of-the-art platform designed for the Indian market.
            Manage guests, amenities, dynamic billing, and staff all in one intuitive dashboard.
          </p>
          <div className={styles.ctaGroup}>
            <button className="btn-primary">View Dashboard</button>
            <button className="glass-panel" style={{ padding: '0.875rem 2rem', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', cursor: 'pointer', background: 'transparent' }}>
              Guest Access
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
