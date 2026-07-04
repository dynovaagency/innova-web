import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link, Navigate } from 'react-router-dom';
import { getCursoBySlug } from '../data/cursos.js';
import styles from './Curso.module.css';

/**
 * Página del curso — muestra la cápsula embebida en un iframe de Genially.
 *
 * Control de acceso:
 *   1. La ruta llega con ?ref=inv_xxx (query param que setea Mercado Pago
 *      cuando redirige después de un pago aprobado).
 *   2. Antes de renderizar el iframe, se llama a /verify-payment con ese ref
 *      y el slug de la URL. Solo si el server responde valid: true se muestra
 *      la cápsula.
 *   3. Si no hay ref o el ref no es válido, se muestra una pantalla de bloqueo
 *      con instrucciones (pero sin exponer detalles de por qué).
 *
 * Ojo: sin backend real esto es tan seguro como el token — quien conozca un
 * ref válido puede acceder. Es el nivel de seguridad esperable en MVP.
 * Fase 2 sumará login por usuario y verificación server-side por sesión.
 */

const STATE = {
  LOADING: 'loading',
  GRANTED: 'granted',
  DENIED: 'denied',
  PENDING: 'pending',
  ERROR: 'error',
};

function Curso() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref');
  const curso = getCursoBySlug(slug);

  const [state, setState] = useState(STATE.LOADING);
  const [reason, setReason] = useState('');

  useEffect(() => {
    // Si no hay curso en el catálogo, no seguimos
    if (!curso) return;

    // Sin ref, denegado directo
    if (!ref) {
      setState(STATE.DENIED);
      setReason('missing_ref');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const url = `/.netlify/functions/verify-payment?ref=${encodeURIComponent(ref)}&slug=${encodeURIComponent(slug)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('No se pudo verificar el acceso');
        const data = await res.json();
        if (cancelled) return;
        if (data.valid) {
          setState(STATE.GRANTED);
        } else if (data.reason === 'pending') {
          setState(STATE.PENDING);
          setReason('pending');
        } else {
          setState(STATE.DENIED);
          setReason(data.reason || 'unknown');
        }
      } catch (err) {
        if (cancelled) return;
        console.error('verify-payment error:', err);
        setState(STATE.ERROR);
      }
    })();

    return () => { cancelled = true; };
  }, [ref, slug, curso]);

  // Si el slug no existe en el catálogo, redirigimos al home.
  if (!curso) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerOverlay} aria-hidden="true" />
        <div className={styles.headerContent}>
          <nav className={styles.breadcrumb} aria-label="Migas de pan">
            <Link to="/">INICIO</Link>
            <span aria-hidden="true">›</span>
            <span>ACCESO AL CURSO</span>
          </nav>
          <span className={styles.headerTag}>{curso.subtitle.toUpperCase()}</span>
          <h1 className={styles.headerTitle}>{curso.title}</h1>
          {state === STATE.GRANTED && (
            <p className={styles.headerDescription}>
              Bienvenido/a. Ya podés comenzar la cápsula. Podés navegar por el contenido a tu ritmo,
              volver cuando quieras y usar el modo pantalla completa para una mejor experiencia.
            </p>
          )}
        </div>
      </header>

      <section className={styles.body}>
        {state === STATE.LOADING && (
          <div className={styles.stateBox}>
            <div className={styles.stateSpinner} aria-hidden="true" />
            <p>Verificando tu acceso...</p>
          </div>
        )}

        {state === STATE.GRANTED && (
          <>
            <div className={styles.iframeWrapper}>
              <iframe
                src={curso.geniallyUrl}
                title={curso.title}
                className={styles.iframe}
                allow="fullscreen; accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
            <div className={styles.support}>
              <p>
                ¿Tenés problemas para visualizar la cápsula? Escribinos y te ayudamos:{' '}
                <a href="mailto:innovatrabajosocial@trabajosocial.ar" className={styles.supportLink}>
                  innovatrabajosocial@trabajosocial.ar
                </a>
              </p>
            </div>
          </>
        )}

        {state === STATE.PENDING && (
          <div className={styles.stateBox}>
            <h2>Tu pago está siendo procesado</h2>
            <p>
              Mercado Pago todavía no confirmó la acreditación del pago. Esto puede tardar
              algunos minutos. Vas a recibir un email cuando esté listo y podés volver a
              esta página desde el link de tu comprobante.
            </p>
            <Link to="/" className={styles.stateBackBtn}>Volver al inicio</Link>
          </div>
        )}

        {state === STATE.DENIED && (
          <div className={styles.stateBox}>
            <h2>No pudimos verificar tu acceso</h2>
            <p>
              Para acceder a la cápsula necesitás completar la inscripción y el pago.
              Si ya pagaste y llegaste acá por error, escribinos a{' '}
              <a href="mailto:innovatrabajosocial@trabajosocial.ar" className={styles.supportLink}>
                innovatrabajosocial@trabajosocial.ar
              </a>{' '}
              y te ayudamos.
            </p>
            <Link to="/servicios/capsula-formativa" className={styles.stateBackBtn}>
              Ir a la cápsula
            </Link>
          </div>
        )}

        {state === STATE.ERROR && (
          <div className={styles.stateBox}>
            <h2>Ups, algo salió mal</h2>
            <p>
              Tuvimos un problema para verificar tu acceso. Volvé a intentar en unos minutos,
              o escribinos a{' '}
              <a href="mailto:innovatrabajosocial@trabajosocial.ar" className={styles.supportLink}>
                innovatrabajosocial@trabajosocial.ar
              </a>.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={styles.stateBackBtn}
            >
              Reintentar
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default Curso;
