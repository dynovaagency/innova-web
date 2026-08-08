import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import Home from './pages/Home.jsx';
import QuienesSomos from './pages/QuienesSomos.jsx';
import Servicios from './pages/Servicios.jsx';
import CapsulaDetalle from './pages/CapsulaDetalle.jsx';
import Formaciones from './pages/Formaciones.jsx';
import Orientacion from './pages/Orientacion.jsx';
import Biblioteca from './pages/Biblioteca.jsx';
import Inscripcion from './pages/Inscripcion.jsx';
import Contacto from './pages/Contacto.jsx';
import Curso from './pages/Curso.jsx';
import PagoPendiente from './pages/PagoPendiente.jsx';
import PagoFallido from './pages/PagoFallido.jsx';
import MockCheckout from './pages/MockCheckout.jsx';
import RecuperarAcceso from './pages/RecuperarAcceso.jsx';

// Admin pages
import AdminLogin from './pages/AdminLogin.jsx';
import AdminVerify from './pages/AdminVerify.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Capsulas from './pages/admin/Capsulas.jsx';
import Pagos from './pages/admin/Pagos.jsx';
import Inscriptos from './pages/admin/Inscriptos.jsx';
import Configuracion from './pages/admin/Configuracion.jsx';
import CapsulaForm from './pages/admin/CapsulaForm.jsx';
import PagoDetalle from './pages/admin/PagoDetalle.jsx';

function App() {
  return (
    <Routes>
      {/* Rutas públicas con layout del sitio (navbar + footer) */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/quienes-somos" element={<QuienesSomos />} />
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/servicios/capsula-formativa" element={<CapsulaDetalle />} />
        <Route path="/formaciones" element={<Formaciones />} />
        <Route path="/orientacion" element={<Orientacion />} />
        <Route path="/biblioteca" element={<Biblioteca />} />
        <Route path="/inscripcion" element={<Inscripcion />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/curso/:slug" element={<Curso />} />
        <Route path="/pago-pendiente" element={<PagoPendiente />} />
        <Route path="/pago-fallido" element={<PagoFallido />} />
        <Route path="/mock-checkout" element={<MockCheckout />} />
        <Route path="/recuperar-acceso" element={<RecuperarAcceso />} />
      </Route>

      {/* Rutas de autenticación admin (sin layout público, sin layout admin) */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/verify" element={<AdminVerify />} />

      {/* Rutas del panel admin (con AdminLayout envolviendo) */}
    <Route path="/admin" element={<AdminLayout />}>
      <Route index element={<Dashboard />} />
      <Route path="capsulas" element={<Capsulas />} />
      <Route path="pagos/:externalReference" element={<PagoDetalle />} />
      <Route path="capsulas/nueva" element={<CapsulaForm />} />
      <Route path="capsulas/:slug/editar" element={<CapsulaForm />} />
      <Route path="pagos" element={<Pagos />} />
      <Route path="inscriptos" element={<Inscriptos />} />
      <Route path="configuracion" element={<Configuracion />} />
    </Route>
    </Routes>
  );
}

export default App;