import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { eliminarBusquedaGuardada, listarMisBusquedas } from '../../services/misBusquedasService';
import { obtenerToken } from '../../services/authService';
import './MisBusquedasPage.css';

const FORM_TO_QUERY = {
  estadoId: 'EstadoId',
  poblacionId: 'PoblacionId',
  localidadId: 'LocalidadId',
  tipoInmueble: 'TipoInmueble',
  precioMin: 'PrecioMin',
  precioMax: 'PrecioMax',
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) {
    return 'Sin limite';
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const getUbicacion = (busqueda) => {
  const partes = [
    busqueda.estadoNombre || busqueda.estadoId,
    busqueda.poblacionNombre || busqueda.poblacionId,
    busqueda.localidadNombre || busqueda.localidadId,
  ].filter(Boolean);

  return partes.length > 0 ? partes.join(' / ') : 'Sin ubicacion';
};

const buildSearchParams = (busqueda) => {
  const params = new URLSearchParams();

  Object.entries(FORM_TO_QUERY).forEach(([key, queryKey]) => {
    const value = busqueda[key];

    if (value !== undefined && value !== null && value !== '') {
      params.set(queryKey, value);
    }
  });

  return params.toString();
};

export default function MisBusquedasPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = obtenerToken();
  const [busquedas, setBusquedas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accionandoId, setAccionandoId] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const controller = new AbortController();

    const cargarBusquedas = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await listarMisBusquedas({ signal: controller.signal });
        setBusquedas(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.data?.mensaje || err.data?.message || 'No fue posible cargar tus busquedas.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    cargarBusquedas();

    return () => controller.abort();
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const verBusqueda = (busqueda) => {
    const query = buildSearchParams(busqueda);
    navigate(query ? `/propiedades?${query}` : '/propiedades');
  };

  const eliminar = async (busqueda) => {
    const confirmado = window.confirm(`Eliminar la busqueda "${busqueda.nombre}"?`);

    if (!confirmado) {
      return;
    }

    setAccionandoId(busqueda.id);
    setError('');
    setMensaje('');

    try {
      await eliminarBusquedaGuardada(busqueda.id);
      setBusquedas((actuales) => actuales.filter((item) => item.id !== busqueda.id));
      setMensaje('Busqueda eliminada correctamente.');
    } catch (err) {
      setError(err.data?.mensaje || err.data?.message || 'No fue posible eliminar la busqueda.');
    } finally {
      setAccionandoId('');
    }
  };

  return (
    <main className="mis-busquedas-page">
      <section className="mis-busquedas-hero">
        <div>
          <p>Cuenta</p>
          <h1>Mis busquedas</h1>
        </div>
        <Link to="/propiedades">Buscar propiedades</Link>
      </section>

      {mensaje ? <p className="mis-busquedas-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="mis-busquedas-feedback is-error">{error}</p> : null}
      {loading ? <p className="mis-busquedas-feedback">Cargando busquedas...</p> : null}

      {!loading && !error && busquedas.length === 0 ? (
        <section className="mis-busquedas-empty">
          <h2>No tienes busquedas guardadas</h2>
          <p>Guarda filtros desde el listado de propiedades para regresar a ellos despues.</p>
          <Link to="/propiedades">Ir a propiedades</Link>
        </section>
      ) : null}

      {!loading && busquedas.length > 0 ? (
        <section className="mis-busquedas-list">
          {busquedas.map((busqueda) => (
            <article key={busqueda.id} className="mis-busquedas-card">
              <div className="mis-busquedas-card-head">
                <div>
                  <h2>{busqueda.nombre}</h2>
                  <span>{busqueda.fechaCreacion}</span>
                </div>
                {busqueda.tipoInmueble ? <strong>{busqueda.tipoInmueble}</strong> : null}
              </div>

              <dl className="mis-busquedas-meta">
                <div>
                  <dt>Ubicacion</dt>
                  <dd>{getUbicacion(busqueda)}</dd>
                </div>
                <div>
                  <dt>Precio minimo</dt>
                  <dd>{formatCurrency(busqueda.precioMin)}</dd>
                </div>
                <div>
                  <dt>Precio maximo</dt>
                  <dd>{formatCurrency(busqueda.precioMax)}</dd>
                </div>
              </dl>

              <div className="mis-busquedas-actions">
                <button type="button" onClick={() => verBusqueda(busqueda)}>
                  Ver busqueda
                </button>
                <button
                  type="button"
                  className="is-danger"
                  onClick={() => eliminar(busqueda)}
                  disabled={accionandoId === busqueda.id}
                >
                  {accionandoId === busqueda.id ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
