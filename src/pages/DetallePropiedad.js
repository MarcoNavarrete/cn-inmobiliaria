// src/pages/DetallePropiedad.js
import React from 'react';
import { useParams } from 'react-router-dom';
import propiedades from '../data/propiedades';
import ImageGallery from 'react-image-gallery';
import 'react-image-gallery/styles/css/image-gallery.css';
import './DetallePropiedad.css';
import { Link } from 'react-router-dom';

export default function DetallePropiedad() {
  const { id } = useParams();
  const propiedad = propiedades.find((p) => p.id === id);

  const obtenerIcono = (texto) => {
    const lower = texto.toLowerCase();
    if (lower.includes('terreno')) return '📐';
    if (lower.includes('construcción')) return '🏗';
    if (lower.includes('recámara')) return '🛏';
    if (lower.includes('recámaras')) return '🛏';
    if (lower.includes('baño')) return '🛁';
    if (lower.includes('estudio')) return '🧠';
    if (lower.includes('sala') || lower.includes('comedor')) return '🛋';
    if (lower.includes('cocina')) return '🍽';
    if (lower.includes('terraza')) return '🌅';
    if (lower.includes('oficina')) return '💼';
    if (lower.includes('vestidor')) return '👗';
    if (lower.includes('cisterna')) return '🚰';
    if (lower.includes('roofgarden')) return '🌿';
    if (lower.includes('crédito')) return '💳';
    if (lower.includes('min de')) return '🚗';
    if (texto.toLowerCase().includes('lavado')) return '🧺';
    if (texto.toLowerCase().includes('pasillo')) return '🚪';
    if (texto.toLowerCase().includes('patio')) return '🌿';
    if (texto.toLowerCase().includes('amenidades')) return '🏊';
    return '🔹';
  };

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
          {propiedad.caracteristicas.map((carac, index) => {
            if (carac.tipo === 'simple') {
              const icono = obtenerIcono(carac.texto);
              return <li key={index}>{icono} {carac.texto}</li>;
            }
            if (carac.tipo === 'grupo') {
              return (
                <li key={index}>
                  ✅ <strong>{carac.titulo}:</strong>
                  <ul className="subcaracteristicas">
                    {carac.opciones.map((opcion, subIndex) => (
                      <li key={subIndex}>{obtenerIcono(opcion)} {opcion}</li>
                    ))}
                  </ul>
                </li>
              );
            }
            return null;
          })}
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

          <div className="boton-contacto">
        {/* <a href="/contacto" className="btn-contacto">Quiero más información</a> */}
        <Link to="/contacto" className="btn-contacto">Quiero más información</Link>
        </div>

        <div className="boton-ver">
        {/* <a href="/Inicio" className="btn-ver">Ver más propiedades</a> */}
        <Link to="/propiedades" className="btn-ver">Ver más propiedades</Link>
      </div>
      </div>
    </section>
  );
}
