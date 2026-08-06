import { LayoutDashboard } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader.jsx';
import EmptyState from '../../components/admin/EmptyState.jsx';

function Dashboard() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Resumen general de la actividad del sitio."
      />
      <EmptyState
        icon={LayoutDashboard}
        title="Dashboard en construcción"
        message="Acá van a aparecer los KPIs de facturación y actividad. Llega en la próxima entrega."
      />
    </>
  );
}

export default Dashboard;