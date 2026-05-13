import React from 'react';
import { Link, useParams } from 'react-router-dom';
import './AdminProyectosInmobiliariosPage.css';

const TITULOS = {
  nuevo: 'Nuevo proyecto',
  editar: 'Editar proyecto',
  unidades: 'Unidades del proyecto',
  modelos: 'Modelos del proyecto',
  plano: 'Plano interactivo',
  imagenes: 'Imagenes del proyecto',
  prospectos: 'Prospectos del proyecto',
};

export default function AdminProyectosInmobiliariosPlaceholderPage({ modulo }) {
  const { proyectoId } = useParams();
  const titulo = TITULOS[modulo] || 'Modulo de proyecto';

  return (
    <main className="admin-proyectos">
      <section className="admin-proyectos-hero">
        <div>
          <p className="admin-proyectos-eyebrow">Proyectos inmobiliarios</p>
          <h1>{titulo}</h1>
        </div>
        <Link className="admin-proyectos-primary" to="/admin/proyectos-inmobiliarios">
          Volver al listado
        </Link>
      </section>
      <section className="admin-proyectos-card">
        <p className="admin-proyectos-empty">
          {proyectoId ? `Proyecto ID: ${proyectoId}. ` : ''}
          Esta pantalla quedo preparada para la siguiente fase del modulo.
        </p>
      </section>
    </main>
  );
}
