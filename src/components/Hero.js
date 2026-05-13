import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Hero.css';

export default function Hero() {
  const navigate = useNavigate();

  const buscarPropiedades = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const tipo = formData.get('tipoInmueble');
    const precioMax = formData.get('precioMax');

    if (tipo) {
      params.set('TipoInmueble', tipo);
    }

    if (precioMax) {
      params.set('PrecioMax', precioMax);
    }

    navigate(`/propiedades${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const irAContacto = (event) => {
    event.preventDefault();
    document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="hero" data-aos="fade-up" data-aos-duration="1200">
      <div className="hero-overlay" />
      <div className="hero-content">
        <p className="hero-eyebrow">CN Inmobiliaria</p>
        <h1>Encuentra una propiedad con valor, estilo y respaldo profesional</h1>
        <p className="hero-copy">
          Casas, terrenos y desarrollos seleccionados para comprar con confianza en Hidalgo y alrededores.
        </p>
        <div className="hero-actions">
          <a href="#buscador-home" className="hero-btn hero-btn-primary">Iniciar busqueda</a>
          <a href="#contacto" className="hero-btn hero-btn-secondary" onClick={irAContacto}>Contactar asesor</a>
        </div>
      </div>

      <form id="buscador-home" className="hero-search" onSubmit={buscarPropiedades}>
        <label>
          <span>Ubicacion</span>
          <input name="ubicacion" type="text" placeholder="Pachuca, Hidalgo" disabled />
        </label>
        <label>
          <span>Operacion</span>
          <select name="operacion" defaultValue="">
            <option value="">Comprar</option>
            <option value="renta">Rentar</option>
          </select>
        </label>
        <label>
          <span>Tipo</span>
          <select name="tipoInmueble" defaultValue="">
            <option value="">Todos</option>
            <option value="casa">Casa</option>
            <option value="terreno">Terreno</option>
            <option value="departamento">Departamento</option>
            <option value="local">Local</option>
            <option value="oficina">Oficina</option>
          </select>
        </label>
        <label>
          <span>Presupuesto</span>
          <select name="precioMax" defaultValue="">
            <option value="">Cualquier rango</option>
            <option value="1000000">Hasta $1 M</option>
            <option value="2000000">Hasta $2 M</option>
            <option value="3500000">Hasta $3.5 M</option>
            <option value="5000000">Hasta $5 M</option>
          </select>
        </label>
        <button type="submit">Buscar</button>
      </form>
    </section>
  );
}
