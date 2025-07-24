// src/pages/DetallePropiedad.js
import React from 'react';
import { useParams } from 'react-router-dom';
import propiedades from '../data/propiedades';
import ImageGallery from 'react-image-gallery';
import 'react-image-gallery/styles/css/image-gallery.css';
import './DetallePropiedad.css';

export default function DetallePropiedad() {
  const { id } = useParams();
  const propiedad = propiedades.find((p) => p.id === id);

  if (!propiedad) {
    return <p>Propiedad no encontrada</p>;
  }

  const galeriaFormateada = propiedad.imagenes.map((img) => ({
    original: img,
    thumbnail: img,
  }));

  return (
    <section className="detalle">
      <div className="carrusel">
        <ImageGallery
          items={galeriaFormateada}
          showFullscreenButton={true}
          showPlayButton={false}
          thumbnailPosition="bottom"
        />
      </div>

      <div className="contenido">
        <h1>{propiedad.titulo}</h1>
        <p className="precio">{propiedad.precio}</p>
        <p className="ubicacion">📍 {propiedad.ubicacion}</p>
        <p className="descripcion">{propiedad.descripcion}</p>

        <ul className="caracteristicas">
          <li>✅ {propiedad.caracteristica1}</li>
          <li>✅ {propiedad.caracteristica2}</li>
          <li>✅ {propiedad.caracteristica3}</li>
        </ul>

        <a href="/contacto" className="btn-contacto">Quiero más información</a>
      </div>
    </section>
  );
}
