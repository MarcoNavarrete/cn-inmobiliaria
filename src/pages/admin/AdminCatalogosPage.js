import React from 'react';
import { Link } from 'react-router-dom';
import useAuthSession from '../../hooks/useAuthSession';
import './AdminCatalogosPage.css';

const SECCIONES = [
  'Tipos de inmueble',
  'Tipos de operacion',
  'Estatus de inmueble',
  'Amenidades',
  'Estados / municipios / localidades',
  'Estatus de unidad',
  'Tipos de unidad',
  'Modelos de desarrollo',
  'Catalogos de loteos / fraccionamientos',
];

export default function AdminCatalogosPage() {
  const { cargando, esAdminCn } = useAuthSession();

  if (cargando) {
    return (
      <main className="admin-catalogos">
        <p className="admin-catalogos-note">Cargando acceso al panel...</p>
      </main>
    );
  }

  if (!cargando && !esAdminCn) {
    return (
      <main className="admin-catalogos">
        <section className="admin-catalogos-empty">
          <h1>No tienes permiso para acceder a esta seccion.</h1>
          <Link to="/admin/proyectos-inmobiliarios">Ir a proyectos inmobiliarios</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-catalogos">
      <section className="admin-catalogos-hero">
        <div>
          <p className="admin-catalogos-eyebrow">Catalogos</p>
          <h1>Catalogos y referencias</h1>
          <p>Base preparada para conectar CRUDs reales de catalogos cuando el API este listo.</p>
        </div>
        <Link to="/admin/dashboard">Volver al dashboard</Link>
      </section>

      <section className="admin-catalogos-note">
        <p>Por ahora estas secciones quedan preparadas visualmente. Cuando existan endpoints CRUD se conectan sin rehacer la pantalla.</p>
      </section>

      <section className="admin-catalogos-grid">
        {SECCIONES.map((seccion) => (
          <article key={seccion} className="admin-catalogos-card">
            <div>
              <h2>{seccion}</h2>
              <span>Pendiente de conectar</span>
            </div>
            <p>La pantalla queda lista para listar, crear, editar y desactivar registros de este catalogo.</p>
            <button type="button" disabled>
              Proximamente
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
