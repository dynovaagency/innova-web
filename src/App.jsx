import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import Home from './pages/Home.jsx';
import QuienesSomos from './pages/QuienesSomos.jsx';
import Servicios from './pages/Servicios.jsx';
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
import CapsulasPublicas from './pages/Capsulas.jsx';
import CapsulaDetallePublica from './pages/CapsulaDetallePublica.jsx';
import Cursos from './pages/Cursos.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import Registro from './pages/Registro.jsx';
import RegistroExitoso from './pages/RegistroExitoso.jsx';
import EmailConfirmado from './pages/EmailConfirmado.jsx';
import Terminos from './pages/Terminos.jsx';
import RecuperarContrasena from './pages/RecuperarContrasena.jsx';
import ResetearContrasena from './pages/ResetearContrasena.jsx';
import ContrasenaActualizada from './pages/ContrasenaActualizada.jsx';

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
    <AuthProvider>

    <Routes>
      {/* Rutas públicas con layout del sitio (navbar + footer) */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/quienes-somos" element={<QuienesSomos />} />
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/servicios/capsulas" element={<CapsulasPublicas />} />
        <Route path="/servicios/cursos" element={<Cursos />} />
        <Route path="/servicios/:slug" element={<CapsulaDetallePublica />} />
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
        <Route path="/registro" element={<Registro />} />
        <Route path="/registro-exitoso" element={<RegistroExitoso />} />
        <Route path="/email-confirmado" element={<EmailConfirmado />} />
        <Route path="/terminos" element={<Terminos />} />
        <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
        <Route path="/resetear-contrasena" element={<ResetearContrasena />} />
        <Route path="/contrasena-actualizada" element={<ContrasenaActualizada />} />
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
    </AuthProvider>
  );
}

export default App;