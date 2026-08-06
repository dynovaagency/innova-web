import { Users } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader.jsx';
import EmptyState from '../../components/admin/EmptyState.jsx';

function Inscriptos() {
  return (
    <>
      <PageHeader
        title="Inscriptos"
        subtitle="Listado de inscriptos por curso."
      />
      <EmptyState
        icon={Users}
        title="Vista de inscriptos en construcción"
        message="Acá van a ver quiénes se inscribieron a cada curso, con opción de exportar a CSV. Llega en la Entrega 5."
      />
    </>
  );
}

export default Inscriptos;