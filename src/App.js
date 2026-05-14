import './App.css';
import './styles/variables.css';

import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Hero from './components/Hero';
import PropiedadesDestacadas from './components/PropiedadesDestacadas';
import DesarrollosDestacados from './components/DesarrollosDestacados';
import Beneficios from './components/Beneficios';
import Nosotros from './components/Nosotros';
import Contacto from './components/Contacto';
import DetallePropiedad from './pages/DetallePropiedad';
import PropiedadesPage from './pages/PropiedadesPage';
import DesarrollosPage from './pages/DesarrollosPage';
import DetalleDesarrolloPage from './pages/DetalleDesarrolloPage';
import ProyectosInmobiliariosPage from './pages/ProyectosInmobiliariosPage';
import ProyectoInmobiliarioDetallePage from './pages/ProyectoInmobiliarioDetallePage';
import FavoritosPage from './pages/FavoritosPage';
import MiCuentaPage from './pages/MiCuentaPage';
import MisSolicitudesPage from './pages/MisSolicitudesPage';
import MisBusquedasPage from './pages/cliente/MisBusquedasPage';
import MisAlertasPage from './pages/cliente/MisAlertasPage';
import AdminTour360Page from './pages/AdminTour360Page';
import AdminInmuebleFormPage from './pages/AdminInmuebleFormPage';
import AdminInmuebleImagenesPage from './pages/AdminInmuebleImagenesPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminPropiedadesPage from './pages/AdminPropiedadesPage';
import AdminProspectosPage from './pages/AdminProspectosPage';
import AdminUsuariosPage from './pages/AdminUsuariosPage';
import AdminDesarrollosPage from './pages/admin/AdminDesarrollosPage';
import AdminProyectosInmobiliariosPage from './pages/admin/AdminProyectosInmobiliariosPage';
import AdminProyectoInmobiliarioFormPage from './pages/admin/AdminProyectoInmobiliarioFormPage';
import AdminProyectoUnidadesPage from './pages/admin/AdminProyectoUnidadesPage';
import AdminProyectoModelosPage from './pages/admin/AdminProyectoModelosPage';
import AdminProyectoPlanoPage from './pages/admin/AdminProyectoPlanoPage';
import AdminProyectoImagenesPage from './pages/admin/AdminProyectoImagenesPage';
import AdminProyectoProspectosPage from './pages/admin/AdminProyectoProspectosPage';
import AdminProyectoApartadosPage from './pages/admin/AdminProyectoApartadosPage';
import AdminProyectosInmobiliariosPlaceholderPage from './pages/admin/AdminProyectosInmobiliariosPlaceholderPage';
import AdminDesarrolloFormPage from './pages/admin/AdminDesarrolloFormPage';
import AdminDesarrolloImagenesPage from './pages/admin/AdminDesarrolloImagenesPage';
import AdminDesarrolloAmenidadesPage from './pages/admin/AdminDesarrolloAmenidadesPage';
import AdminDesarrolloModelosPage from './pages/admin/AdminDesarrolloModelosPage';
import AdminDesarrolloUnidadesPage from './pages/admin/AdminDesarrolloUnidadesPage';
import AdminDesarrolloModeloImagenesPage from './pages/admin/AdminDesarrolloModeloImagenesPage';
import AdminDesarrolloTour360Page from './pages/admin/AdminDesarrolloTour360Page';
import AdminModeloTour360Page from './pages/admin/AdminModeloTour360Page';
import AdminTour360HotspotsPage from './pages/admin/AdminTour360HotspotsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
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
              <DesarrollosDestacados />
              <Beneficios />
              <Nosotros />
              <Contacto />
            </>
          }
        />
        <Route path="/propiedades" element={<PropiedadesPage />} />
        <Route path="/desarrollos" element={<DesarrollosPage />} />
        <Route path="/desarrollos/:id" element={<DetalleDesarrolloPage />} />
        <Route path="/proyectos-inmobiliarios" element={<ProyectosInmobiliariosPage />} />
        <Route path="/proyectos-inmobiliarios/:slug" element={<ProyectoInmobiliarioDetallePage />} />
        <Route path="/favoritos" element={<FavoritosPage />} />
        <Route path="/mis-solicitudes" element={<MisSolicitudesPage />} />
        <Route
          path="/cliente/mis-busquedas"
          element={
            <ProtectedRoute>
              <MisBusquedasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cliente/mis-alertas"
          element={
            <ProtectedRoute>
              <MisAlertasPage />
            </ProtectedRoute>
          }
        />
        <Route path="/mi-cuenta" element={<MiCuentaPage />} />
        <Route path="/nosotros" element={<Nosotros />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
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
          <Route path="proyectos-inmobiliarios" element={<AdminProyectosInmobiliariosPage />} />
          <Route path="proyectos-inmobiliarios/nuevo" element={<AdminProyectoInmobiliarioFormPage />} />
          <Route path="proyectos-inmobiliarios/:proyectoId/editar" element={<AdminProyectoInmobiliarioFormPage />} />
          <Route path="proyectos-inmobiliarios/:proyectoId/unidades" element={<AdminProyectoUnidadesPage />} />
          <Route path="proyectos-inmobiliarios/:proyectoId/modelos" element={<AdminProyectoModelosPage />} />
          <Route path="proyectos-inmobiliarios/:proyectoId/plano" element={<AdminProyectoPlanoPage />} />
          <Route path="proyectos-inmobiliarios/:proyectoId/imagenes" element={<AdminProyectoImagenesPage />} />
          <Route path="proyectos-inmobiliarios/prospectos" element={<AdminProyectoProspectosPage />} />
          <Route path="proyectos-inmobiliarios/apartados" element={<AdminProyectoApartadosPage />} />
          <Route path="proyectos-inmobiliarios/:proyectoId/prospectos" element={<AdminProyectosInmobiliariosPlaceholderPage modulo="prospectos" />} />
          <Route path="desarrollos" element={<AdminDesarrollosPage />} />
          <Route path="desarrollos/nuevo" element={<AdminDesarrolloFormPage />} />
          <Route path="desarrollos/:desarrolloId/editar" element={<AdminDesarrolloFormPage />} />
          <Route path="desarrollos/:desarrolloId/imagenes" element={<AdminDesarrolloImagenesPage />} />
          <Route path="desarrollos/:desarrolloId/amenidades" element={<AdminDesarrolloAmenidadesPage />} />
          <Route path="desarrollos/:desarrolloId/tour-360" element={<AdminDesarrolloTour360Page />} />
          <Route path="desarrollos/:desarrolloId/modelos" element={<AdminDesarrolloModelosPage />} />
          <Route path="desarrollos/:desarrolloId/unidades" element={<AdminDesarrolloUnidadesPage />} />
          <Route path="desarrollos/:desarrolloId/modelos/:modeloId/imagenes" element={<AdminDesarrolloModeloImagenesPage />} />
          <Route path="desarrollos/:desarrolloId/modelos/:modeloId/tour-360" element={<AdminModeloTour360Page />} />
          <Route path="tours-360/escenas/:escenaId/hotspots" element={<AdminTour360HotspotsPage />} />
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
