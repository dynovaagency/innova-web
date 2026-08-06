import { BookOpen } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader.jsx';
import EmptyState from '../../components/admin/EmptyState.jsx';

function Capsulas() {
  return (
    <>
      <PageHeader
        title="Cápsulas"
        subtitle="Gestión del catálogo de cápsulas formativas."
      />
      <EmptyState
        icon={BookOpen}
        title="Gestión de cápsulas en construcción"
        message="Acá van a poder crear, editar y desactivar cápsulas. Llega en la Entrega 3."
      />
    </>
  );
}

export default Capsulas;