import { CreditCard } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader.jsx';
import EmptyState from '../../components/admin/EmptyState.jsx';

function Pagos() {
  return (
    <>
      <PageHeader
        title="Pagos"
        subtitle="Consulta y gestión de las compras realizadas."
      />
      <EmptyState
        icon={CreditCard}
        title="Vista de pagos en construcción"
        message="Acá van a ver el listado de pagos con filtros y podrán reenviar accesos. Llega en la Entrega 4."
      />
    </>
  );
}

export default Pagos;