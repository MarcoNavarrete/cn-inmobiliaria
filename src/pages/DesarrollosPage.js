import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarDesarrollos } from '../services/desarrollosService';
import './DesarrollosPage.css';

const formatCurrency = (value) => {
  if (!value || Number.isNaN(Number(value))) {
    return 'Precio por confirmar';
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(Number(value));
};

export default function DesarrollosPage() {
  const [desarrollos, setDesarrollos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const cargarDesarrollos = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await listarDesarrollos({ signal: controller.signal });
        setDesarrollos(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.data?.mensaje || err.data?.message || 'No fue posible cargar los desarrollos.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    cargarDesarrollos();

    return () => controller.abort();
  }, []);

  const heroImage = useMemo(
    () => desarrollos.find((desarrollo) => desarrollo.imagenPrincipal)?.imagenPrincipal || '',
    [desarrollos]
  );

  return (
    <main className="desarrollos-page">
      <section className="desarrollos-hero">
        <div
          className={`desarrollos-hero-bg ${heroImage ? '' : 'is-placeholder'}`}
          style={heroImage ? { backgroundImage: `linear-gradient(90deg, rgba(9, 22, 35, 0.86), rgba(26, 61, 124, 0.48)), url(${heroImage})` } : undefined}
        >
          <div>
            <p>Desarrollos inmobiliarios</p>
            <h1>Proyectos residenciales con vision patrimonial</h1>
          </div>
          <span>Producto premium CN Inmobiliaria</span>
        </div>
      </section>

      <section className="desarrollos-intro">
        <div>
          <p>Desarrollos inmobiliarios</p>
          <h2>Un portafolio separado para proyectos residenciales</h2>
          <span>Preventas, modelos disponibles, amenidades y planes de compra en una experiencia enfocada en desarrollo inmobiliario.</span>
        </div>
      </section>

      {loading ? <p className="desarrollos-feedback">Cargando desarrollos...</p> : null}
      {error ? <p className="desarrollos-feedback is-error">{error}</p> : null}

      {!loading && !error && desarrollos.length === 0 ? (
        <section className="desarrollos-empty">
          <h2>No hay desarrollos disponibles</h2>
          <p>Pronto publicaremos nuevos proyectos residenciales.</p>
        </section>
      ) : null}

      {!loading && !error && desarrollos.length > 0 ? (
        <section className="desarrollos-grid" aria-label="Listado de desarrollos">
          {desarrollos.map((desarrollo) => (
            <article key={desarrollo.id || desarrollo.slug} className="desarrollo-card">
              <div className={`desarrollo-card-media ${desarrollo.imagenPrincipal ? '' : 'is-placeholder'}`}>
                {desarrollo.imagenPrincipal ? (
                  <img src={desarrollo.imagenPrincipal} alt={desarrollo.nombre} />
                ) : (
                  <div>Imagen proximamente</div>
                )}
                <span>{desarrollo.destacado ? 'Desarrollo destacado' : 'Desarrollo premium'}</span>
              </div>
              <div className="desarrollo-card-body">
                <div>
                  <h2>{desarrollo.nombre}</h2>
                  <p>{desarrollo.ubicacion || 'Ubicacion por confirmar'}</p>
                </div>
                <strong>Desde {formatCurrency(desarrollo.precioDesde)}</strong>
                {desarrollo.amenidades.length > 0 ? (
                  <ul>
                    {desarrollo.amenidades.slice(0, 4).map((amenidad) => (
                      <li key={amenidad}>{amenidad}</li>
                    ))}
                  </ul>
                ) : null}
                <Link to={`/desarrollos/${desarrollo.slug}`}>Ver desarrollo</Link>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
