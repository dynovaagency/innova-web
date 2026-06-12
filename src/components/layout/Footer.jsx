import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

function LogoMarkLight() {
  // Logo Innova versión oscura (sobre fondo azul del footer)
  return (
    <svg viewBox="0 0 60 50" width="40" height="34" fill="none" aria-hidden="true">
      {/* Bocadillo sage (atrás) */}
      <path
        d="M22 4 H53 a3 3 0 0 1 3 3 V26 a3 3 0 0 1 -3 3 H44 l-2 6 -4 -6 H22 a3 3 0 0 1 -3 -3 V7 a3 3 0 0 1 3 -3 z"
        stroke="#82C6C5"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Bocadillo rojo coral (delante) */}
      <path
        d="M5 16 H38 a3 3 0 0 1 3 3 V40 a3 3 0 0 1 -3 3 H20 l-6 5 0 -5 H5 a3 3 0 0 1 -3 -3 V19 a3 3 0 0 1 3 -3 z"
        stroke="#F04847"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="#153F71"
      />
    </svg>
  );
}

function SocialIcon({ label, href, path, external = false }) {
  const targetProps = external
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {};
  return (
    <a href={href} aria-label={label} className={styles.socialIcon} {...targetProps}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
        <path d={path} />
      </svg>
    </a>
  );
}

// TODO: reemplazar por los datos reales cuando Innova los confirme.
const CONTACT = {
  instagram: 'https://instagram.com/innova.trabajosocial',
  whatsapp: 'https://wa.me/5491100000000', // formato internacional sin "+"
  email: 'innovatrabajosocial@trabajosocial.ar',
};

const socials = [
  {
    name: 'instagram',
    label: 'Instagram',
    href: CONTACT.instagram,
    external: true,
    path: 'M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6zm9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25zM12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z',
  },
  {
    name: 'whatsapp',
    label: 'WhatsApp',
    href: CONTACT.whatsapp,
    external: true,
    path: 'M19.05 4.91A9.816 9.816 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.73 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01zm-7.01 15.24c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.264 8.264 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.183 8.183 0 0 1 2.41 5.83c.02 4.54-3.68 8.23-8.22 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43s.17-.25.25-.41c.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18s-.22-.16-.47-.28z',
  },
  {
    name: 'email',
    label: 'Email',
    href: `mailto:${CONTACT.email}`,
    external: false,
    path: 'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 2v.5l-8 5-8-5V6h16zm0 12H4V8.25l8 5 8-5V18z',
  },
];

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <Link to="/" className={styles.brand} aria-label="Innova Trabajo Social — Inicio">
          <LogoMarkLight />
          <span className={styles.brandText}>
            INNOVA
            <span className={styles.tagline}>TRABAJO SOCIAL</span>
          </span>
        </Link>

        <ul className={styles.socials}>
          {socials.map((s) => (
            <li key={s.name}>
              <SocialIcon {...s} />
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.copy}>
        <span>&copy; {year} Innova Trabajo Social. Todos los derechos reservados.</span>
      </div>
    </footer>
  );
}

export default Footer;
