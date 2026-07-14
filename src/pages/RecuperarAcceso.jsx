import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './RecuperarAcceso.module.css';

/**
 * Página de recuperación de acceso a una cápsula ya comprada.
 *
 * El usuario ingresa el email con el que hizo la compra. Consultamos la
 * function /.netlify/functions/recuperar-acceso que busca en Blobs por
 * buyerEmail y status=approved.
 *
 * Estados posibles:
 *   idle       → form vacío listo para completar
 *   loading    → esperando respuesta del backend
 *   found      → hay al menos una compra approved, mostramos los links
 *   notFound   → no hay coincidencias. Mensaje neutro (no confirma/niega).
 *   error      → problema técnico. Sugerimos reintentar o contactar soporte.
 */
function RecuperarAcceso() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [cursos, setCursos] = useState([]);
  const [copiedSlug, setCopiedSlug] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    setCursos([]);

    try {
      const res = await fetch('/.netlify/functions/recuperar-acceso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        setStatus('error');
        return;
      }

      const data = await res.json();
      if (data.found && data.cursos?.length > 0) {
        setCursos(data.cursos);
        setStatus('found');
      } else {
        setStatus('notFound');
      }
    } catch (err) {
      console.error('[recuperar-acceso] fetch error:', err);
      setStatus('error');
    }
  };

  const handleCopy = async (link, slug) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    } catch {
      // Fallback silencioso: si clipboard no está disponible, el usuario
      // igual tiene el link visible y puede copiarlo a mano.
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Recuperar acceso a tu cápsula</h1>
        <p className={styles.description}>
          Si compraste una cápsula y perdiste el link, ingresá el email que usaste
          en la compra y te mostramos el acceso.
        </p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <label htmlFor="email" className={styles.label}>
            Email de compra
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            disabled={status === 'loading'}
            className={styles.input}
            autoComplete="email"
          />
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={status === 'loading' || !email.trim()}
          >
            {status === 'loading' ? 'Buscando…' : 'Buscar mi acceso'}
          </button>
        </form>

        {status === 'found' && (
          <div className={styles.results}>
            <p className={styles.resultsIntro}>
              Encontramos {cursos.length === 1 ? 'tu compra' : `${cursos.length} compras`}:
            </p>
            <ul className={styles.cursosList}>
              {cursos.map((c) => (
                <li key={c.slug} className={styles.cursoItem}>
                  <h3 className={styles.cursoTitle}>{c.title}</h3>
                  <div className={styles.cursoActions}>
                    <a
                      href={c.link}
                      className={styles.accessBtn}
                    >
                      Ir a la cápsula
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopy(c.link, c.slug)}
                      className={styles.copyBtn}
                    >
                      {copiedSlug === c.slug ? '¡Copiado!' : 'Copiar link'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className={styles.tip}>
              Guardá el link o marcá esta página en favoritos para volver a encontrarlo.
            </p>
          </div>
        )}

        {status === 'notFound' && (
          <div className={`${styles.message} ${styles.messageNeutral}`}>
            <p>
              No encontramos ninguna compra confirmada con ese email. Puede ser porque:
            </p>
            <ul className={styles.reasons}>
              <li>El pago todavía no se acreditó (algunos medios tardan hasta 48 h).</li>
              <li>Usaste otro email al hacer la compra.</li>
              <li>El pago quedó rechazado o pendiente.</li>
            </ul>
            <p>
              Si creés que hay un error, escribinos a{' '}
              <a href="mailto:innovatrabajosocial@trabajosocial.ar" className={styles.link}>
                innovatrabajosocial@trabajosocial.ar
              </a>{' '}
              con tu comprobante de pago y te ayudamos.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className={`${styles.message} ${styles.messageError}`}>
            <p>
              Hubo un problema al procesar tu búsqueda. Probá de nuevo en unos minutos
              o escribinos a{' '}
              <a href="mailto:innovatrabajosocial@trabajosocial.ar" className={styles.link}>
                innovatrabajosocial@trabajosocial.ar
              </a>.
            </p>
          </div>
        )}

        <div className={styles.footer}>
          <Link to="/" className={styles.backLink}>← Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}

export default RecuperarAcceso;
