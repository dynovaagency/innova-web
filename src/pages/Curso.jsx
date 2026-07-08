import { useEffect, useState, useRef } from 'react';
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
 * Polling para resolver timing de MP:
 *   MP redirige al usuario al back_url ANTES de que el webhook actualice el
 *   status en nuestro store. Puede haber una ventana de 2-5 segundos donde
 *   verify-payment devuelve "pending" aunque el pago ya esté aprobado.
 *   Solución: si viene pending, hacemos polling cada 2s hasta 30s máximo.
 *   Si sigue pending después de eso, mostramos la pantalla real de pending.
 */

const STATE = {
  LOADING: 'loading',
  GRANTED: 'granted',
  DENIED: 'denied',
  PENDING: 'pending',
  ERROR: 'error',
};

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 15; // 15 x 2s = 30s máximo

function Curso() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref');
  const curso = getCursoBySlug(slug);

  const [state, setState] = useState(STATE.LOADING);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!curso) return;

    if (!ref) {
      setState(STATE.DENIED);
      return;
    }

    cancelledRef.current = false;
    let attempts = 0;

    const verify = async () => {
      try {
        const url = `/.netlify/functions/verify-payment?ref=${encodeURIComponent(ref)}&slug=${encodeURIComponent(slug)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('No se pudo verificar el acceso');
        const data = await res.json();
        if (cancelledRef.current) return;

        if (data.valid) {
          setState(STATE.GRANTED);
          return;
        }

        // Si viene pending y todavía hay intentos, seguimos polling.
        // Esto cubre el gap entre "MP redirige" y "webhook actualiza Blobs".
        if (data.reason === 'pending' && attempts < POLL_MAX_ATTEMPTS) {
          attempts += 1;
          setTimeout(verify, POLL_INTERVAL_MS);
          return;
        }

        if (data.reason === 'pending') {
          setState(STATE.PENDING);
        } else {
          setState(STATE.DENIED);
        }
      } catch (err) {
        if (cancelledRef.current) return;
        console.error('verify-payment error:', err);
        setState(STATE.ERROR);
      }
    };

    verify();

    return () => { cancelledRef.current = true; };
  }, [ref, slug, curso]);

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
