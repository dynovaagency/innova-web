import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import styles from './ContrasenaActualizada.module.css';

/**
 * Página que muestra el éxito del reset de password.
 *
 * El usuario llega acá después de setear password nuevo en
 * /resetear-contrasena. Como Supabase mantiene la sesión activa
 * durante el flow de reset, el usuario ya queda logueado.
 */
function ContrasenaActualizada() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.iconWrap} aria-hidden="true">
          <CheckCircle size={40} />
        </div>
        <h1 className={styles.title}>¡Contraseña actualizada!</h1>
        <p className={styles.description}>
          Tu contraseña se cambió correctamente. Ya podés ingresar con tu nueva contraseña.
        </p>
        <div className={styles.actions}>
          <Link to="/" className={styles.primaryBtn}>Ir al inicio</Link>
        </div>
      </div>
    </div>
  );
}

export default ContrasenaActualizada;