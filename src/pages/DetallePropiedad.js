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
      {propiedad.video && (
        <div className="video">
          <video controls width="100%">
            <source src={propiedad.video} type="video/mp4" />
            Tu navegador no soporta el video.
          </video>
        </div>
      )}
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
          {propiedad.caracteristicas.map((carac, index) => (
            <li key={index}>✅ {carac}</li>
          ))}
        </ul>

        <div className="mapa">
        <iframe
          title="Ubicación"
          src={`https://www.google.com/maps?q=${encodeURIComponent(propiedad.ubicacion)}&output=embed`}
          width="100%"
          height="300"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
        ></iframe>
      </div>

        <a href="/contacto" className="btn-contacto">Quiero más información</a>
      </div>
    </section>
  );
}
