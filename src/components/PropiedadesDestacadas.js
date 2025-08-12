// src/components/PropiedadesDestacadas.js
import React from 'react';
import './PropiedadesDestacadas.css';
import propiedades from '../data/propiedades';
import { Link } from 'react-router-dom';


export default function PropiedadesDestacadas() {
  return (
    <section className="propiedades" data-aos="fade-up" data-aos-duration="1200">
      <h2>Propiedades destacadas</h2>
      <div className="tarjetas" data-aos="zoom-in" data-aos-delay="100">
       {propiedades.map((prop) => (
        <div key={prop.id} className="tarjeta">
          <img src={prop.imagenes[0]} alt={prop.titulo} />
          <h3>{prop.titulo}</h3>
          <p>{prop.precio} · {prop.ubicacion}</p>
          <Link to={`/propiedad/${prop.id}`} className="btn-mas">Ver más</Link>
        </div>
      ))}
      </div>
    </section>
  );
}