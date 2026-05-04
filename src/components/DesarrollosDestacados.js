import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarDesarrollos } from '../services/desarrollosService';
import './DesarrollosDestacados.css';

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

export default function DesarrollosDestacados() {
  const [desarrollos, setDesarrollos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const cargarDesarrollos = async () => {
      setLoading(true);

      try {
        const data = await listarDesarrollos({ signal: controller.signal });
        setDesarrollos(data);
      } catch (_) {
        if (!controller.signal.aborted) {
          setDesarrollos([]);
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

  const desarrollosVisibles = useMemo(() => {
    const destacados = desarrollos.filter((desarrollo) => desarrollo.destacado);
    const base = destacados.length > 0 ? destacados : desarrollos;

    return base.slice(0, 3);
  }, [desarrollos]);

  if (!loading && desarrollosVisibles.length === 0) {
    return null;
  }

  return (
    <section className="home-desarrollos" data-aos="fade-up" data-aos-duration="1100">
      <div className="home-desarrollos-head">
        <div>
          <p>Producto premium</p>
          <h2>Desarrollos inmobiliarios destacados</h2>
        </div>
        <Link to="/desarrollos">Ver todos los desarrollos</Link>
      </div>

      {loading ? (
        <p className="home-desarrollos-feedback">Cargando desarrollos...</p>
      ) : (
        <div className="home-desarrollos-grid">
          {desarrollosVisibles.map((desarrollo) => (
            <article key={desarrollo.id || desarrollo.slug} className="home-desarrollo-card">
              <div className={`home-desarrollo-media ${desarrollo.imagenPrincipal ? '' : 'is-placeholder'}`}>
                {desarrollo.imagenPrincipal ? (
                  <img src={desarrollo.imagenPrincipal} alt={desarrollo.nombre} />
                ) : (
                  <div>Imagen proximamente</div>
                )}
                <span>Desarrollo premium</span>
              </div>
              <div className="home-desarrollo-body">
                <div>
                  <h3>{desarrollo.nombre}</h3>
                  <p>{desarrollo.ubicacion || 'Ubicacion por confirmar'}</p>
                </div>
                <strong>Desde {formatCurrency(desarrollo.precioDesde)}</strong>
                <Link to={`/desarrollos/${desarrollo.slug}`}>Ver desarrollo</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
