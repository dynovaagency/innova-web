import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import styles from './Biblioteca.module.css';

import imgUBA from '../assets/biblioteca/uba.jpg';
import imgLaPlata from '../assets/biblioteca/laplata.jpg';
import imgMardelPlata from '../assets/biblioteca/mardelplata.jpg';
import imgUNPAZ from '../assets/biblioteca/unpaz.jpg';
import imgLaMatanza from '../assets/biblioteca/lamatanza.jpg';
import imgLomas from '../assets/biblioteca/lomas.jpg';
import imgCordoba from '../assets/biblioteca/cordoba.jpg';
import imgUNICEN from '../assets/biblioteca/unicen.jpg';
import imgAmnistia from '../assets/biblioteca/amnistia.png';
import imgClacso from '../assets/biblioteca/clacso.png';

/**
 * Biblioteca Abierta — directorio de revistas académicas y portales
 * externos. Cada card lleva al sitio web del recurso original.
 * Cuando Innova confirme el catálogo definitivo, este array se actualiza
 * (sumar/quitar entradas en `recursos` y ajustar `href` con la URL real).
 */
const recursos = [
  {
    id: 'uba',
    categoria: 'Revistas - Argentina',
    tipo: 'REVISTA',
    nombre: 'UBA',
    imagen: imgUBA,
    href: 'https://trabajosocial.sociales.uba.ar/revista-debate-publico-2/'
  },
  {
    id: 'laplata',
    categoria: 'Revistas - Argentina',
    tipo: 'REVISTA',
    nombre: 'La Plata',
    imagen: imgLaPlata,
    href: 'https://revistas.unlp.edu.ar/escenarios',
  },
  {
    id: 'mardelplata',
    categoria: 'Revistas - Argentina',
    tipo: 'REVISTA',
    nombre: 'Mar del Plata',
    imagen: imgMardelPlata,
    href: 'https://revista.salud.mdp.edu.ar/index.php/dc',
  },
  {
    id: 'unpaz',
    categoria: 'Revistas - Argentina',
    tipo: 'REVISTA',
    nombre: 'UNPAZ',
    imagen: imgUNPAZ,
    href: 'https://publicaciones.unpaz.edu.ar/OJS/index.php/ts',
  },
  {
    id: 'lamatanza',
    categoria: 'Revistas - Argentina',
    tipo: 'REVISTA',
    nombre: 'La Matanza',
    imagen: imgLaMatanza,
    href: 'https://rihumso.unlam.edu.ar/index.php/humanidades',
  },
  {
    id: 'lomas',
    categoria: 'Revistas - Argentina',
    tipo: 'REVISTA',
    nombre: 'Lomas de Zamora',
    imagen: imgLomas,
    href: 'http://revistas.unlz.edu.ar/ojs/',
  },
  {
    id: 'cordoba',
    categoria: 'Revistas - Argentina',
    tipo: 'REVISTA',
    nombre: 'Córdoba',
    imagen: imgCordoba,
    href: 'https://sociales.unc.edu.ar/content/revista-concienciasocial',
  },
  {
    id: 'unicen',
    categoria: 'Revistas - Argentina',
    tipo: 'REVISTA',
    nombre: 'UNICEN',
    imagen: imgUNICEN,
    href: 'https://ojs2.fch.unicen.edu.ar/ojs-3.1.0/index.php/plaza-publica/issue/archive',
  },
  {
    id: 'amnistia',
    categoria: 'Revistas - Argentina',
    tipo: 'REVISTA',
    nombre: 'Amnistia',
    imagen: imgAmnistia,
    href: 'https://amnistia.org.ar/buscar?busqueda=Biblioteca%20',
  },
  {
    id: 'clacso',
    categoria: 'Revistas - Argentina',
    tipo: 'REVISTA',
    nombre: 'CLACSO',
    imagen: imgClacso,
    href: 'https://www.clacso.org/publicaciones/',
  },
];

const categorias = [
  'Revistas - Argentina',
  'Revistas - Resto del Mundo',
  'Colegios Profesionales',
];

function WebBadge() {
  return (
    <span className={styles.cardBadge}>
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      WEB
    </span>
  );
}

function ResourceCard({ recurso }) {
  return (
    <article className={styles.card}>
      <div className={styles.cardImage}>
        <img src={recurso.imagen} alt={recurso.nombre} loading="lazy" />
        <WebBadge />
      </div>
      <div className={styles.cardBody}>
        <span className={styles.cardType}>{recurso.tipo}</span>
        <h3 className={styles.cardTitle}>{recurso.nombre}</h3>
        <a
          href={recurso.href}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.cardCta}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Ir a la web
        </a>
      </div>
    </article>
  );
}

function Biblioteca() {
  const [categoriaActiva, setCategoriaActiva] = useState('Revistas - Argentina');
  const [busqueda, setBusqueda] = useState('');

  const recursosFiltrados = useMemo(() => {
    return recursos.filter((r) => {
      const matchCategoria = r.categoria === categoriaActiva;
      const q = busqueda.trim().toLowerCase();
      const matchBusqueda = !q || r.nombre.toLowerCase().includes(q);
      return matchCategoria && matchBusqueda;
    });
  }, [categoriaActiva, busqueda]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerOverlay} aria-hidden="true" />
        <div className={styles.headerContent}>
          <nav className={styles.breadcrumb} aria-label="Migas de pan">
            <Link to="/">INICIO</Link>
            <span aria-hidden="true">›</span>
            <span>BIBLIOTECA</span>
          </nav>
          <span className={styles.headerTag}>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path d="M2 3h5a3 3 0 0 1 3 3v8a2 2 0 0 0-2-2H2z" />
              <path d="M14 3H9a3 3 0 0 0-3 3v8a2 2 0 0 1 2-2h6z" />
            </svg>
            RECURSOS Y SABERES
          </span>
          <h1 className={styles.headerTitle}>Biblioteca Abierta</h1>
          <p className={styles.headerDescription}>
            Explorá nuestra colección de revistas, portales y recursos académicos
            seleccionados para profesionales del Trabajo Social.
          </p>
          <div className={styles.helpBox}>
            <h2 className={styles.helpTitle}>¿CÓMO USAR?</h2>
            <p className={styles.helpText}>
              <strong>Acceso a recursos.</strong> Hacé click en cualquier recurso para acceder
              directamente. Algunos pueden requerir registro institucional o credenciales
              universitarias.
            </p>
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Categorías
          </h2>
          <ul className={styles.categoryList}>
            {categorias.map((cat) => (
              <li key={cat}>
                <button
                  type="button"
                  className={`${styles.categoryBtn} ${categoriaActiva === cat ? styles.categoryActive : ''}`}
                  onClick={() => setCategoriaActiva(cat)}
                >
                  {cat.toUpperCase()}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className={styles.content}>
          <div className={styles.search}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder="Buscar por título, autor o palabra clave..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {recursosFiltrados.length === 0 ? (
            <p className={styles.empty}>
              No hay recursos cargados en esta categoría todavía.
            </p>
          ) : (
            <div className={styles.grid}>
              {recursosFiltrados.map((r) => (
                <ResourceCard key={r.id} recurso={r} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Biblioteca;
