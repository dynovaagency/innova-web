import Button from '../components/ui/Button.jsx';
import styles from './Home.module.css';

const features = [
  { num: '01', title: 'Mobile app', description: 'Lorem ipsum dolor sit amet consectetur adipiscing elit semper dalaracc lacus vel facilisis volutpat est velitolm.' },
  { num: '02', title: 'Desktop app', description: 'Lorem ipsum dolor sit amet consectetur adipiscing elit semper dalaracc lacus vel facilisis volutpat est velitolm.' },
  { num: '03', title: 'Multiple users', description: 'Lorem ipsum dolor sit amet consectetur adipiscing elit semper dalaracc lacus vel facilisis volutpat est velitolm.' },
  { num: '04', title: 'Integrations', description: 'Lorem ipsum dolor sit amet consectetur adipiscing elit semper dalaracc lacus vel facilisis volutpat est velitolm.' },
  { num: '05', title: 'Monthly reports', description: 'Lorem ipsum dolor sit amet consectetur adipiscing elit semper dalaracc lacus vel facilisis volutpat est velitolm.' },
  { num: '06', title: 'Granular permissions', description: 'Lorem ipsum dolor sit amet consectetur adipiscing elit semper dalaracc lacus vel facilisis volutpat est velitolm.' },
];

const checks = [
  'Interaction design',
  'Finding and managing',
  'Finding and managing',
  'Usability testing',
  'Information architecture',
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="20" height="20" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15" />
      <path d="M6 10.5L9 13.5L14.5 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlaceholderImage() {
  return (
    <svg viewBox="0 0 200 160" fill="none" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect x="0" y="0" width="200" height="160" fill="transparent" />
      <circle cx="80" cy="65" r="12" fill="currentColor" opacity="0.25" />
      <path d="M40 130 L90 80 L130 110 L160 90 L160 130 Z" fill="currentColor" opacity="0.25" />
    </svg>
  );
}

function Home() {
  return (
    <div className={styles.home}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>A dedicated team to grow your company</h1>
          <p className={styles.heroDescription}>
            Lorem ipsum dolor sit amet consectetur adipiscing eli mattis sit phasellus mollis sit aliquam sit nullam neque ultrices.
          </p>
          <div className={styles.heroActions}>
            <Button variant="primary">Get started</Button>
            <Button variant="secondary">Talk to sales</Button>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className={styles.features}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Browse our set of features</h2>
          <p className={styles.sectionDescription}>
            Lorem ipsum dolor sit amet consectetur adipiscing elit semper dalar elementum tempus hac tellus libero accumsan.
          </p>
        </header>
        <div className={styles.featuresGrid}>
          {features.map((feature) => (
            <article key={feature.num} className={styles.featureCard}>
              <span className={styles.featureNum}>{feature.num}</span>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA with checks */}
      <section className={styles.cta}>
        <div className={styles.ctaImageBox}>
          <PlaceholderImage />
        </div>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Create your account today and get started for free!</h2>
          <ul className={styles.checkList}>
            {checks.map((label, idx) => (
              <li key={idx} className={styles.checkItem}>
                <span className={styles.checkIcon}>
                  <CheckIcon />
                </span>
                {label}
              </li>
            ))}
          </ul>
          <div className={styles.ctaActions}>
            <Button variant="primary">Get started</Button>
            <Button variant="secondary">Talk to sales</Button>
          </div>
        </div>
      </section>

      {/* Instagram */}
      <section className={styles.instagram}>
        <h2 className={styles.sectionTitle}>Follow us on Instagram</h2>
        <p className={styles.sectionDescription}>
          Lorem ipsum dolor sit amet consectetur adipiscing elit semper dalar elementum tempus hac tellus libero accumsan.
        </p>
        <div className={styles.instagramAction}>
          <Button variant="primary">Follow us</Button>
        </div>
      </section>
    </div>
  );
}

export default Home;
