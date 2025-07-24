// src/components/PropiedadesDestacadas.js
import React from 'react';
import './PropiedadesDestacadas.css';
import propiedades from '../data/propiedades';


// const propiedades = [
//   {
//     id: 1,
//     imagen: '/assets/casa1.jpg',
//     titulo: 'Residencia moderna en zona exclusiva',
//     precio: '$3,450,000 MXN',
//     ubicacion: 'Pachuca, Hidalgo',
//   },
//   {
//     id: 2,
//     imagen: '/assets/casa2.jpg',
//     titulo: 'Casa familiar con jardín amplio',
//     precio: '$1,780,000 MXN',
//     ubicacion: 'Mineral de la Reforma, Hidalgo',
//   },
//   {
//     id: 3,
//     imagen: '/assets/casa3.jpg',
//     titulo: 'Departamento céntrico remodelado',
//     precio: '$1,250,000 MXN',
//     ubicacion: 'Centro, Pachuca',
//   },
// ];

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
          <a href={`/propiedad/${prop.id}`} className="btn-mas">Ver más</a>
        </div>
      ))}
      </div>
    </section>
  );
}