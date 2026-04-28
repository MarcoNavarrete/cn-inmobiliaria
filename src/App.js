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
import PropiedadesPage from './pages/PropiedadesPage';
import AdminTour360Page from './pages/AdminTour360Page';
import AdminInmuebleFormPage from './pages/AdminInmuebleFormPage';
import AdminInmuebleImagenesPage from './pages/AdminInmuebleImagenesPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminPropiedadesPage from './pages/AdminPropiedadesPage';
import AdminProspectosPage from './pages/AdminProspectosPage';
import AdminUsuariosPage from './pages/AdminUsuariosPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
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
        <Route path="/propiedades" element={<PropiedadesPage />} />
        <Route path="/nosotros" element={<Nosotros />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/propiedad/:id" element={<DetallePropiedad />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="propiedades" element={<AdminPropiedadesPage />} />
          <Route path="prospectos" element={<AdminProspectosPage />} />
          <Route path="usuarios" element={<AdminUsuariosPage />} />
          <Route path="inmuebles/nuevo" element={<AdminInmuebleFormPage />} />
          <Route path="inmuebles/editar/:id" element={<AdminInmuebleFormPage />} />
          <Route path="inmuebles/:id/imagenes" element={<AdminInmuebleImagenesPage />} />
          <Route path="tours360/:inmuebleId" element={<AdminTour360Page />} />
        </Route>
      </Routes> 
      <Footer />
      <WhatsAppFlotante />
    </Router>
  );
}


export default App;
