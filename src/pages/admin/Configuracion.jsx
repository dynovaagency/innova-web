import { useOutletContext } from 'react-router-dom';
import PageHeader from '../../components/admin/PageHeader.jsx';
import Toast from '../../components/admin/Toast.jsx';
import useToast from '../../hooks/useToast.js';
import CambiarContrasena from '../mi-cuenta/CambiarContrasena.jsx';
import DatosFacturacion from './DatosFacturacion.jsx';
import styles from './Configuracion.module.css';

const ROLE_LABELS = {
  superadmin: 'Superadministrador',
  admin: 'Administrador',
};

/**
 * Configuración del panel admin.
 *
 * - Mi cuenta: datos del admin logueado.
 * - Cambiar contraseña: reutiliza el mismo formulario del panel de alumnos.
 * - Datos de facturación: datos fiscales y certificado de ARCA del admin,
 *   para los que emiten facturas a su nombre.
 */
function Configuracion() {
  const { admin } = useOutletContext() || {};
  const toast = useToast();

  return (
    <>
      <PageHeader
        title="Configuración"
        subtitle="Datos de tu cuenta, seguridad del acceso y facturación."
      />

      <div className={styles.page}>
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Mi cuenta</h2>
          <dl className={styles.dl}>
            <div className={styles.dlRow}>
              <dt>Nombre</dt>
              <dd>{admin?.name || '—'}</dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Email</dt>
              <dd>{admin?.email || '—'}</dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Rol</dt>
              <dd>{ROLE_LABELS[admin?.role] || admin?.role || '—'}</dd>
            </div>
          </dl>
          <p className={styles.hint}>
            Para modificar tu nombre o tu email, contactá a un superadministrador.
          </p>
        </section>

        <CambiarContrasena
          email={admin?.email}
          onSuccess={() =>
            toast.success(
              'Contraseña actualizada',
              'La próxima vez ingresá con tu nueva contraseña.'
            )
          }
        />

        <DatosFacturacion toast={toast} />
      </div>

      <Toast {...toast.props} />
    </>
  );
}

export default Configuracion;