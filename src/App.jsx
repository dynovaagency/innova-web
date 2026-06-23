import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import Home from './pages/Home.jsx';
import QuienesSomos from './pages/QuienesSomos.jsx';
import Servicios from './pages/Servicios.jsx';
import CapsulaDetalle from './pages/CapsulaDetalle.jsx';
import Formaciones from './pages/Formaciones.jsx';
import Orientacion from './pages/Orientacion.jsx';
import Biblioteca from './pages/Biblioteca.jsx';
import Contacto from './pages/Contacto.jsx';

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
        <Route path="/contacto" element={<Contacto />} />
      </Route>
    </Routes>
  );
}

export default App;
