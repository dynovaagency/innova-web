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

function App() {
  return (
    <Routes>
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
    </Routes>
  );
}

export default App;
