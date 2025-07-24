import logo from './logo.svg';
import './App.css';
import './styles/variables.css';

import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Hero from './components/Hero';
import PropiedadesDestacadas from './components/PropiedadesDestacadas';
import Beneficios from './components/Beneficios';
import Nosotros from './components/Nosotros';
import Contacto from './components/Contacto';
import DetallePropiedad from './pages/DetallePropiedad';
import WhatsAppFlotante from './components/WhatsAppFlotante';

import AOS from 'aos';
import 'aos/dist/aos.css';

AOS.init({ once: true });


function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Hero />
              <PropiedadesDestacadas />
              <Beneficios />
              <Nosotros />
              <Contacto />
            </>
          }
        />
        <Route path="/propiedades" element={<PropiedadesDestacadas />} />
        <Route path="/nosotros" element={<Nosotros />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/propiedad/:id" element={<DetallePropiedad />} />
      </Routes>
      <Footer />
      <WhatsAppFlotante />
    </Router>
  );
}


export default App;
