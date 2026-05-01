import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './PropiedadesDestacadas.css';
import { obtenerInmueblesPublicos } from '../services/inmueblesService';
import { obtenerToken } from '../services/authService';
import { agregarFavorito, eliminarFavorito, obtenerFavoritos } from '../services/favoritosService';

export default function ListadoPropiedadesPublicas({
  filtros = {},
  titulo = 'Propiedades destacadas',
  mostrarFiltros = false,
  filtrosSlot = null,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [propiedades, setPropiedades] = useState([]);
  const [favoritosIds, setFavoritosIds] = useState(new Set());
  const [favoritoAccion, setFavoritoAccion] = useState('');
  const [favoritoMensaje, setFavoritoMensaje] = useState('');
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

  useEffect(() => {
    const token = obtenerToken();

    if (!token) {
      setFavoritosIds(new Set());
      return undefined;
    }

    const controller = new AbortController();

    const cargarFavoritos = async () => {
      try {
        const data = await obtenerFavoritos({ signal: controller.signal });
        setFavoritosIds(new Set(data.map((favorito) => String(favorito.id))));
      } catch (_) {
        if (!controller.signal.aborted) {
          setFavoritosIds(new Set());
        }
      }
    };

    cargarFavoritos();

    return () => controller.abort();
  }, [location.pathname, location.search]);

  const alternarFavorito = async (propiedadId) => {
    if (!obtenerToken()) {
      navigate('/login', { state: { from: location } });
      return;
    }

    const id = String(propiedadId);
    const esFavorito = favoritosIds.has(id);
    setFavoritoAccion(id);
    setFavoritoMensaje('');

    try {
      if (esFavorito) {
        await eliminarFavorito(id);
      } else {
        await agregarFavorito(id);
      }

      setFavoritosIds((actuales) => {
        const siguientes = new Set(actuales);

        if (esFavorito) {
          siguientes.delete(id);
        } else {
          siguientes.add(id);
        }

        return siguientes;
      });
      setFavoritoMensaje(esFavorito ? 'Propiedad quitada de favoritos.' : 'Propiedad guardada en favoritos.');
    } catch (err) {
      setFavoritoMensaje(err.data?.mensaje || err.data?.message || 'No fue posible actualizar favoritos.');
    } finally {
      setFavoritoAccion('');
    }
  };

  return (
    <section className="propiedades" data-aos="fade-up" data-aos-duration="1200">
      <h2>{titulo}</h2>
      {mostrarFiltros ? filtrosSlot : null}
      {favoritoMensaje ? <p className="estado-feedback favoritos-feedback">{favoritoMensaje}</p> : null}
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
              <button
                type="button"
                className={`favorito-btn ${favoritosIds.has(String(prop.id)) ? 'is-active' : ''}`}
                onClick={() => alternarFavorito(prop.id)}
                disabled={favoritoAccion === String(prop.id)}
                aria-label={favoritosIds.has(String(prop.id)) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              >
                {favoritosIds.has(String(prop.id)) ? '♥' : '♡'}
              </button>
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
