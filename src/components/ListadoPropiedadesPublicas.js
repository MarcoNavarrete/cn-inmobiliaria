import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './PropiedadesDestacadas.css';
import { obtenerInmueblesPublicos } from '../services/inmueblesService';

export default function ListadoPropiedadesPublicas({
  filtros = {},
  titulo = 'Propiedades destacadas',
  mostrarFiltros = false,
  filtrosSlot = null,
}) {
  const [propiedades, setPropiedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const filtrosNormalizados = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filtros || {}).filter(([, value]) => {
          if (value === undefined || value === null) {
            return false;
          }

          if (typeof value === 'string') {
            return value.trim() !== '';
          }

          return true;
        })
      ),
    [filtros]
  );
  const filtrosKey = useMemo(
    () => JSON.stringify(filtrosNormalizados),
    [filtrosNormalizados]
  );
  const filtrosParaConsulta = useMemo(
    () => JSON.parse(filtrosKey),
    [filtrosKey]
  );

  useEffect(() => {
    const controller = new AbortController();

    const cargarPropiedades = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await obtenerInmueblesPublicos(filtrosParaConsulta, {
          signal: controller.signal,
        });
        setPropiedades(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError('No fue posible cargar las propiedades por ahora.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    cargarPropiedades();

    return () => controller.abort();
  }, [filtrosKey, filtrosParaConsulta]);

  return (
    <section className="propiedades" data-aos="fade-up" data-aos-duration="1200">
      <h2>{titulo}</h2>
      {mostrarFiltros ? filtrosSlot : null}
      {loading ? (
        <p className="estado-feedback">Cargando propiedades...</p>
      ) : error ? (
        <div className="estado-feedback estado-error">
          <p>{error}</p>
        </div>
      ) : propiedades.length === 0 ? (
        <p className="estado-feedback">No hay propiedades publicas disponibles en este momento.</p>
      ) : (
        <div className="tarjetas" data-aos="zoom-in" data-aos-delay="100">
          {propiedades.map((prop) => (
            <div key={prop.id} className="tarjeta">
              {(prop.imagenPrincipal || prop.imagenes?.[0]) ? (
                <img src={prop.imagenPrincipal || prop.imagenes?.[0]} alt={prop.titulo} />
              ) : (
                <div className="tarjeta-placeholder">Imagen no disponible</div>
              )}
              <h3>{prop.titulo}</h3>
              <p>{`${prop.precio} - ${prop.ubicacion}`}</p>
              <Link to={`/propiedad/${prop.id}`} className="btn-mas">Ver mas</Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
