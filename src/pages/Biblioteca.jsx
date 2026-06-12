import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import styles from './Biblioteca.module.css';

// Recursos de ejemplo. Se reemplazan cuando Innova confirme su catálogo real.
const recursos = [
  {
    id: 1,
    categoria: 'Libros',
    titulo: 'Intervención Social y Complejidad',
    anio: '2023',
    autor: 'Dra. María Fernández',
    descripcion:
      'Un análisis profundo sobre las nuevas metodologías de intervención en contextos de alta vulnerabilidad y exclusión social.',
  },
  {
    id: 2,
    categoria: 'Normativas',
    titulo: 'Políticas Públicas de Cuidado',
    anio: '2024',
    autor: 'Ministerio de Desarrollo',
    descripcion:
      'Marco regulatorio actualizado sobre las políticas de cuidado integral y el rol de las instituciones del Estado.',
  },
  {
    id: 3,
    categoria: 'Artículos',
    titulo: 'Repensar las Prácticas en el Territorio',
    anio: '2022',
    autor: 'Lic. Pablo Cárdenas',
    descripcion:
      'Artículo de reflexión sobre los desafíos éticos y metodológicos del trabajo social comunitario en el siglo XXI.',
  },
  {
    id: 4,
    categoria: 'Investigaciones',
    titulo: 'Informe Anual de Vulnerabilidad',
    anio: '2023',
    autor: 'Observatorio Social',
    descripcion:
      'Datos cualitativos y cuantitativos sobre el estado de la vulnerabilidad social en áreas urbanas marginadas.',
  },
  {
    id: 5,
    categoria: 'Libros',
    titulo: 'Ética y Derechos Humanos',
    anio: '2021',
    autor: 'Instituto INNOVA',
    descripcion:
      'Compendio teórico-práctico sobre el enfoque de derechos humanos aplicado a la asistencia social.',
  },
  {
    id: 6,
    categoria: 'Artículos',
    titulo: 'Estrategias de Inserción Laboral',
    anio: '2024',
    autor: 'Grupo de Trabajo Social',
    descripcion:
      'Revisión de programas exitosos para la inserción sociolaboral de jóvenes en riesgo.',
  },
];

const categorias = ['Todos', 'Artículos', 'Libros', 'Normativas', 'Investigaciones'];

const CATEGORIA_ICONS = {
  Artículos: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </svg>
  ),
  Libros: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  Normativas: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  Investigaciones: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
};

function ResourceCard({ recurso }) {
  return (
    <article className={styles.card}>
      <div className={styles.cardImage} aria-hidden="true">
        <svg viewBox="0 0 200 120" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <rect width="200" height="120" fill="#153F71" opacity="0.85" />
          <rect x="60" y="35" width="80" height="55" rx="3" fill="#F4F1EB" opacity="0.85" />
          <line x1="70" y1="50" x2="130" y2="50" stroke="#153F71" strokeWidth="2" opacity="0.4" />
          <line x1="70" y1="60" x2="125" y2="60" stroke="#153F71" strokeWidth="2" opacity="0.4" />
          <line x1="70" y1="70" x2="130" y2="70" stroke="#153F71" strokeWidth="2" opacity="0.4" />
          <line x1="70" y1="80" x2="115" y2="80" stroke="#153F71" strokeWidth="2" opacity="0.4" />
        </svg>
        <span className={styles.cardBadge}>
          {CATEGORIA_ICONS[recurso.categoria]}
          {recurso.categoria.toUpperCase()}
        </span>
      </div>
      <div className={styles.cardBody}>
        <span className={styles.cardYear}>{recurso.anio}</span>
        <h3 className={styles.cardTitle}>{recurso.titulo}</h3>
        <p className={styles.cardAuthor}>Por {recurso.autor}</p>
        <p className={styles.cardDescription}>{recurso.descripcion}</p>
        <a href="#download" className={styles.downloadBtn}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Descargar PDF
        </a>
      </div>
    </article>
  );
}

function Biblioteca() {
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');

  const recursosFiltrados = useMemo(() => {
    return recursos.filter((r) => {
      const matchCategoria = categoriaActiva === 'Todos' || r.categoria === categoriaActiva;
      const q = busqueda.trim().toLowerCase();
      const matchBusqueda =
        !q ||
        r.titulo.toLowerCase().includes(q) ||
        r.autor.toLowerCase().includes(q) ||
        r.descripcion.toLowerCase().includes(q);
      return matchCategoria && matchBusqueda;
    });
  }, [categoriaActiva, busqueda]);

  return (
    <div className={styles.page}>
      {/* HEADER */}
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
            Explora nuestra colección de recursos, artículos, normativas y material de consulta
            indispensable para el ejercicio y la investigación en las disciplinas sociales.
          </p>
        </div>
      </header>

      {/* CONTENIDO */}
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
                  {cat}
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
            <p className={styles.empty}>No se encontraron recursos con los filtros aplicados.</p>
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
