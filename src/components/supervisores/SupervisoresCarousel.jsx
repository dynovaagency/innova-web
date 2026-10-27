import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { getIniciales } from '../../data/supervisores.js';
import styles from './SupervisoresCarousel.module.css';

/**
 * Foto del profesional, o sus iniciales si todavía no hay foto.
 * La usan la tarjeta del carrusel y la página de perfil.
 */
export function SupervisorFoto({ supervisor, className = '', eager = false }) {
  if (supervisor.foto) {
    return (
      <img
        src={supervisor.foto}
        alt={`Foto de ${supervisor.nombre}`}
        className={`${styles.foto} ${className}`}
        loading={eager ? 'eager' : 'lazy'}
      />
    );
  }
  return (
    <div className={`${styles.fotoPlaceholder} ${className}`} role="img" aria-label={supervisor.nombre}>
      <span>{getIniciales(supervisor.nombre)}</span>
    </div>
  );
}

/**
 * Carrusel de profesionales: varias tarjetas a la vista (4 en pantallas
 * grandes, 3 en notebooks, 2 en tablet, y en el celular una y un poco de
 * la siguiente). Se desliza con el dedo o con las flechas; los puntitos
 * muestran en qué parte está.
 * Cada tarjeta entera es un link al perfil.
 *
 * Props:
 *   supervisores: lista (ver src/data/supervisores.js)
 *   title, subtitle: encabezado de la sección (opcionales)
 */
function SupervisoresCarousel({ supervisores, title, subtitle }) {
  const trackRef = useRef(null);
  const [nav, setNav] = useState({ page: 0, pages: 1, atStart: true, atEnd: true });

  // Ancho de un paso: una tarjeta más el espacio entre tarjetas.
  const getStep = useCallback(() => {
    const track = trackRef.current;
    const card = track?.querySelector('li');
    if (!track || !card) return 1;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return card.getBoundingClientRect().width + gap;
  }, []);

  const update = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const step = getStep();
    const visible = Math.max(1, Math.round((track.clientWidth + 1) / step));
    const pages = Math.max(1, supervisores.length - visible + 1);
    const page = Math.min(pages - 1, Math.round(track.scrollLeft / step));
    setNav({
      page,
      pages,
      atStart: track.scrollLeft <= 4,
      atEnd: track.scrollLeft + track.clientWidth >= track.scrollWidth - 4,
    });
  }, [getStep, supervisores.length]);

  useEffect(() => {
    update();
    const track = trackRef.current;
    if (!track) return undefined;
    let frame = null;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        update();
      });
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      track.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', update);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [update]);

  const scrollToPage = (page) => {
    trackRef.current?.scrollTo({ left: page * getStep(), behavior: 'smooth' });
  };

  const scrollByCards = (direction) => {
    trackRef.current?.scrollBy({ left: direction * getStep(), behavior: 'smooth' });
  };

  if (!supervisores?.length) return null;

  return (
    <section className={styles.section} aria-labelledby="supervisores-titulo">
      {(title || subtitle) && (
        <header className={styles.header}>
          {title && (
            <h2 id="supervisores-titulo" className={styles.title}>
              {title}
            </h2>
          )}
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </header>
      )}

      <div className={styles.viewport}>
        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowPrev}`}
          onClick={() => scrollByCards(-1)}
          disabled={nav.atStart}
          aria-label="Ver profesionales anteriores"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>

        <ul ref={trackRef} className={styles.track} aria-label="Profesionales de supervisión">
          {supervisores.map((s) => (
            <li key={s.slug} className={styles.slide}>
              <Link to={`/servicios/supervisiones/${s.slug}`} className={styles.card}>
                <div className={styles.photoWrap}>
                  <SupervisorFoto supervisor={s} />
                </div>
                <div className={styles.body}>
                  {s.especialidad && <p className={styles.eyebrow}>{s.especialidad}</p>}
                  <h3 className={styles.name}>{s.nombre}</h3>
                  {s.resumen && <p className={styles.summary}>{s.resumen}</p>}
                  <span className={styles.more}>
                    Ver perfil
                    <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowNext}`}
          onClick={() => scrollByCards(1)}
          disabled={nav.atEnd}
          aria-label="Ver más profesionales"
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>

      {nav.pages > 1 && (
        <div className={styles.dots}>
          {Array.from({ length: nav.pages }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.dot} ${i === nav.page ? styles.dotActive : ''}`}
              onClick={() => scrollToPage(i)}
              aria-label={`Ir a la posición ${i + 1} de ${nav.pages}`}
              aria-current={i === nav.page ? 'true' : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default SupervisoresCarousel;