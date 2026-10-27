import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import Home from './pages/Home.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import RequireAuth from './components/auth/RequireAuth.jsx';

// Sitio público
const QuienesSomos = lazy(() => import('./pages/QuienesSomos.jsx'));
const Servicios = lazy(() => import('./pages/Servicios.jsx'));
const Formaciones = lazy(() => import('./pages/Formaciones.jsx'));
const Orientacion = lazy(() => import('./pages/Orientacion.jsx'));
const Biblioteca = lazy(() => import('./pages/Biblioteca.jsx'));
const Inscripcion = lazy(() => import('./pages/Inscripcion.jsx'));
const Contacto = lazy(() => import('./pages/Contacto.jsx'));
const Curso = lazy(() => import('./pages/Curso.jsx'));
const PagoPendiente = lazy(() => import('./pages/PagoPendiente.jsx'));
const PagoFallido = lazy(() => import('./pages/PagoFallido.jsx'));
const MockCheckout = lazy(() => import('./pages/MockCheckout.jsx'));
const RecuperarAcceso = lazy(() => import('./pages/RecuperarAcceso.jsx'));
const CapsulasPublicas = lazy(() => import('./pages/Capsulas.jsx'));
const CapsulaDetallePublica = lazy(() => import('./pages/CapsulaDetallePublica.jsx'));
const Cursos = lazy(() => import('./pages/Cursos.jsx'));
const SupervisorPerfil = lazy(() => import('./pages/SupervisorPerfil.jsx'));
const Registro = lazy(() => import('./pages/Registro.jsx'));
const RegistroExitoso = lazy(() => import('./pages/RegistroExitoso.jsx'));
const EmailConfirmado = lazy(() => import('./pages/EmailConfirmado.jsx'));
const Terminos = lazy(() => import('./pages/Terminos.jsx'));
const RecuperarContrasena = lazy(() => import('./pages/RecuperarContrasena.jsx'));
const ResetearContrasena = lazy(() => import('./pages/ResetearContrasena.jsx'));
const ContrasenaActualizada = lazy(() => import('./pages/ContrasenaActualizada.jsx'));

// Panel de alumno
const UserLayout = lazy(() => import('./pages/mi-cuenta/UserLayout.jsx'));
const MiDashboard = lazy(() => import('./pages/mi-cuenta/MiDashboard.jsx'));
const MisCursos = lazy(() => import('./pages/mi-cuenta/MisCursos.jsx'));
const MiPerfil = lazy(() => import('./pages/mi-cuenta/MiPerfil.jsx'));
const CambiarContrasena = lazy(() => import('./pages/mi-cuenta/CambiarContrasena.jsx'));

// Panel admin
const AdminLogin = lazy(() => import('./pages/AdminLogin.jsx'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const Capsulas = lazy(() => import('./pages/admin/Capsulas.jsx'));
const Pagos = lazy(() => import('./pages/admin/Pagos.jsx'));
const Inscriptos = lazy(() => import('./pages/admin/Inscriptos.jsx'));
const Configuracion = lazy(() => import('./pages/admin/Configuracion.jsx'));
const CapsulaForm = lazy(() => import('./pages/admin/CapsulaForm.jsx'));
const PagoDetalle = lazy(() => import('./pages/admin/PagoDetalle.jsx'));
const Cupones = lazy(() => import('./pages/admin/Cupones.jsx'));
const CuponForm = lazy(() => import('./pages/admin/CuponForm.jsx'));
const CuponDetalle = lazy(() => import('./pages/admin/CuponDetalle.jsx'));

/*
 * Carga diferida: cada página se descarga recién cuando se visita, así el
 * sitio público no baja el código del panel admin ni del panel de alumno.
 * Home y el layout del sitio van en el paquete principal porque son lo
 * primero que ve cualquiera que entra.
 *
 * El Suspense va dentro de cada ruta (y no envolviendo todo) para que el
 * navbar, el footer y los layouts de los paneles sigan visibles mientras
 * carga la página.
 */
function PageLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: '40vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-muted)',
        fontSize: 'var(--font-size-sm)',
      }}
    >
      Cargando…
    </div>
  );
}

const page = (element) => <Suspense fallback={<PageLoader />}>{element}</Suspense>;

function App() {
  return (
    <AuthProvider>

    <Routes>
      {/* Rutas públicas con layout del sitio (navbar + footer) */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/quienes-somos" element={page(<QuienesSomos />)} />
        <Route path="/servicios" element={page(<Servicios />)} />
        <Route path="/servicios/capsulas" element={page(<CapsulasPublicas />)} />
        <Route path="/servicios/cursos" element={page(<Cursos />)} />
        <Route path="/servicios/supervisiones/:slug" element={page(<SupervisorPerfil />)} />
        <Route path="/servicios/:slug" element={page(<CapsulaDetallePublica />)} />
        <Route path="/formaciones" element={page(<Formaciones />)} />
        <Route path="/orientacion" element={page(<Orientacion />)} />
        <Route path="/biblioteca" element={page(<Biblioteca />)} />
        <Route path="/inscripcion" element={page(<Inscripcion />)} />
        <Route path="/contacto" element={page(<Contacto />)} />
        <Route path="/curso/:slug" element={page(<Curso />)} />
        <Route path="/pago-pendiente" element={page(<PagoPendiente />)} />
        <Route path="/pago-fallido" element={page(<PagoFallido />)} />
        <Route path="/mock-checkout" element={page(<MockCheckout />)} />
        <Route path="/recuperar-acceso" element={page(<RecuperarAcceso />)} />
        <Route path="/registro" element={page(<Registro />)} />
        <Route path="/registro-exitoso" element={page(<RegistroExitoso />)} />
        <Route path="/email-confirmado" element={page(<EmailConfirmado />)} />
        <Route path="/terminos" element={page(<Terminos />)} />
        <Route path="/recuperar-contrasena" element={page(<RecuperarContrasena />)} />
        <Route path="/resetear-contrasena" element={page(<ResetearContrasena />)} />
        <Route path="/contrasena-actualizada" element={page(<ContrasenaActualizada />)} />
      </Route>

      {/* Rutas del panel de alumno (protegidas por RequireAuth) */}
      <Route element={<RequireAuth />}>
        <Route path="/mi-cuenta" element={page(<UserLayout />)}>
          <Route index element={page(<MiDashboard />)} />
          <Route path="mis-cursos" element={page(<MisCursos />)} />
          <Route path="perfil" element={page(<MiPerfil />)} />
          <Route path="contrasena" element={page(<CambiarContrasena />)} />
        </Route>
      </Route>

      {/* Rutas de autenticación admin (sin layout público, sin layout admin) */}
      <Route path="/admin/login" element={page(<AdminLogin />)} />

      {/* Rutas del panel admin (con AdminLayout envolviendo) */}
    <Route path="/admin" element={page(<AdminLayout />)}>
      <Route index element={page(<Dashboard />)} />
      <Route path="capsulas" element={page(<Capsulas />)} />
      <Route path="pagos/:externalReference" element={page(<PagoDetalle />)} />
      <Route path="cupones" element={page(<Cupones />)} />
      <Route path="cupones/nuevo" element={page(<CuponForm />)} />
      <Route path="cupones/:id" element={page(<CuponDetalle />)} />
      <Route path="cupones/:id/editar" element={page(<CuponForm />)} />
      <Route path="capsulas/nueva" element={page(<CapsulaForm />)} />
      <Route path="capsulas/:slug/editar" element={page(<CapsulaForm />)} />
      <Route path="pagos" element={page(<Pagos />)} />
      <Route path="inscriptos" element={page(<Inscriptos />)} />
      <Route path="configuracion" element={page(<Configuracion />)} />
    </Route>
    </Routes>
    </AuthProvider>
  );
}

export default App;