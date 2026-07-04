import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import styles from './MockCheckout.module.css';

/**
 * Página que SIMULA el Checkout Pro de Mercado Pago cuando MOCK_MODE está activo.
 * Permite testear el flujo completo (aprobar/rechazar/pending) sin tener
 * credenciales reales de MP.
 *
 * En producción esta ruta nunca se alcanza porque create-preference devuelve
 * un initPoint real de MP.
 *
 * IMPORTANTE: dejar esta página deployada aunque MOCK_MODE esté off. Ocupa
 * casi nada y sirve como salvavidas si algún día hay que degradar a modo mock
 * temporalmente por caída de MP.
 */
function MockCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ref = searchParams.get('ref');
  const slug = searchParams.get('slug');
  const [processing, setProcessing] = useState(false);

  const approve = async () => {
    if (!ref) return;
    setProcessing(true);
    try {
      const res = await fetch(`/.netlify/functions/mock-approve?ref=${encodeURIComponent(ref)}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.approved) {
        navigate(`/curso/${slug || data.cursoSlug}?ref=${ref}`);
      } else {
        alert('No se pudo aprobar el pago mock');
        setProcessing(false);
      }
    } catch (err) {
      alert('Error al aprobar: ' + err.message);
      setProcessing(false);
    }
  };

  const reject = () => {
    navigate(`/pago-fallido?ref=${ref}`);
  };

  const markPending = () => {
    navigate(`/pago-pendiente?ref=${ref}`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.mockLabel}>MODO DE PRUEBA</div>
        <h1 className={styles.title}>Simulador de Mercado Pago</h1>
        <p className={styles.description}>
          Esta pantalla reemplaza al Checkout Pro real hasta que carguemos las
          credenciales de Mercado Pago. Elegí qué escenario querés simular:
        </p>

        <dl className={styles.info}>
          <div>
            <dt>Referencia</dt>
            <dd><code>{ref || '—'}</code></dd>
          </div>
          <div>
            <dt>Curso</dt>
            <dd>{slug || '—'}</dd>
          </div>
        </dl>

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnApprove}`}
            onClick={approve}
            disabled={processing}
          >
            {processing ? 'Procesando...' : '✓ Aprobar pago'}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPending}`}
            onClick={markPending}
            disabled={processing}
          >
            ⏱ Dejar pendiente
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnReject}`}
            onClick={reject}
            disabled={processing}
          >
            ✗ Rechazar pago
          </button>
        </div>
      </div>
    </div>
  );
}

export default MockCheckout;
