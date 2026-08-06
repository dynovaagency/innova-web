import { Settings } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader.jsx';
import EmptyState from '../../components/admin/EmptyState.jsx';

function Configuracion() {
  return (
    <>
      <PageHeader
        title="Configuración"
        subtitle="Ajustes generales del sistema."
      />
      <EmptyState
        icon={Settings}
        title="Configuración en construcción"
        message="Esta sección va a incluir gestión de admins y otros ajustes. Fuera del alcance del Sprint 2."
      />
    </>
  );
}

export default Configuracion;