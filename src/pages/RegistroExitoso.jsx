import { useLocation, Link, Navigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import styles from './RegistroExitoso.module.css';

/**
 * Página post-registro exitoso.
 *
 * Le explicamos al usuario que tiene que confirmar su email antes de
 * poder loguearse. Recibe el email en location.state.email (lo pasa
 * la página de registro).
 *
 * Si alguien navega directo a esta URL sin haber pasado por el registro,
 * redirigimos a home.
 */
function RegistroExitoso() {
  const location = useLocation();
  const email = location.state?.email;

  if (!email) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.iconWrap} aria-hidden="true">
          <Mail size={40} />
        </div>
        <h1 className={styles.title}>¡Bienvenido/a a INNOVA!</h1>
        <p className={styles.description}>
          Te enviamos un email a <strong>{email}</strong> con un link para confirmar tu cuenta.
        </p>
        <p className={styles.description}>
          Revisá tu casilla (y la carpeta de spam por las dudas), hacé clic en el link, y ya vas a poder ingresar.
        </p>

        <div className={styles.actions}>
          <Link to="/" className={styles.primaryBtn}>Volver al inicio</Link>
        </div>

        <p className={styles.helpText}>
          ¿No te llegó el mail? Revisá que hayas ingresado el email correctamente, o escribinos a{' '}
          <a href="mailto:innovatrabajosocial@trabajosocial.ar" className={styles.link}>
            innovatrabajosocial@trabajosocial.ar
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export default RegistroExitoso;