import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  cambiarEstatusInmueble,
  enviarRevisionInmueble,
  obtenerAdminInmuebles,
  publicarInmueble,
  rechazarInmueble,
} from '../services/adminInmueblesService';
import { obtenerUsuarioDesdeToken } from '../services/authService';
import './AdminPropiedadesPage.css';

const FILTROS_INICIALES = {
  busqueda: '',
  estatus: '',
  tipoInmueble: '',
  vistaRapida: 'TODOS',
};

const ROLES_PUEDE_APROBAR = ['SUPERVISOR', 'ADMIN', 'SUPERADMIN'];
const ESTATUS_PUEDE_ENVIAR_REVISION = ['ASESOR', 'SUPERVISOR', 'ADMIN', 'SUPERADMIN'];
const ESTATUS_CAMBIO_DIRECTO = ['APARTADO', 'VENDIDO', 'INACTIVO'];

const VISTAS_RAPIDAS = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'PENDIENTES', label: 'Pendientes de aprobacion' },
  { id: 'BORRADORES', label: 'Borradores' },
  { id: 'PUBLICADOS', label: 'Publicados' },
];

const ESTATUS_LABELS = {
  BORRADOR: 'Borrador',
  PENDIENTE_REVISION: 'En revision',
  DISPONIBLE: 'Publicado',
  APARTADO: 'Apartado',
  VENDIDO: 'Vendido',
  RECHAZADO: 'Rechazado',
  INACTIVO: 'Inactivo',
};

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible procesar la accion.';

export default function AdminPropiedadesPage() {
  const location = useLocation();
  const vistaInicial = new URLSearchParams(location.search).get('vista') || 'TODOS';
  const [inmuebles, setInmuebles] = useState([]);
  const [filtros, setFiltros] = useState({
    ...FILTROS_INICIALES,
    vistaRapida: VISTAS_RAPIDAS.some((vista) => vista.id === vistaInicial) ? vistaInicial : 'TODOS',
  });
  const [cargando, setCargando] = useState(true);
  const [accionando, setAccionando] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const usuario = obtenerUsuarioDesdeToken();
  const rolUsuario = String(usuario?.rol || '').toUpperCase();
  const puedeAprobar = ROLES_PUEDE_APROBAR.includes(rolUsuario);
  const puedeEnviarRevision = ESTATUS_PUEDE_ENVIAR_REVISION.includes(rolUsuario);

  const cargarInmuebles = useCallback(async (options = {}) => {
    setCargando(true);
    setError('');

    try {
      const data = await obtenerAdminInmuebles(options);
      setInmuebles(data);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.data?.mensaje || err.data?.message || err.message || 'No fue posible cargar inmuebles.');
      }
    } finally {
      if (!options.signal?.aborted) {
        setCargando(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    cargarInmuebles({ signal: controller.signal });

    return () => controller.abort();
  }, [cargarInmuebles]);

  useEffect(() => {
    const vista = new URLSearchParams(location.search).get('vista');

    if (vista && VISTAS_RAPIDAS.some((item) => item.id === vista)) {
      setFiltros((actual) => ({
        ...actual,
        vistaRapida: vista,
      }));
    }
  }, [location.search]);

  const estatusDisponibles = useMemo(
    () => [...new Set(inmuebles.map((item) => item.estatus).filter(Boolean))].sort(),
    [inmuebles]
  );

  const tiposDisponibles = useMemo(
    () => [...new Set(inmuebles.map((item) => item.tipoInmueble).filter(Boolean))].sort(),
    [inmuebles]
  );

  const inmueblesFiltrados = useMemo(() => {
    const busqueda = filtros.busqueda.trim().toLowerCase();

    return inmuebles.filter((inmueble) => {
      const coincideBusqueda = !busqueda || inmueble.titulo.toLowerCase().includes(busqueda);
      const coincideEstatus = !filtros.estatus || inmueble.estatus === filtros.estatus;
      const coincideTipo = !filtros.tipoInmueble || inmueble.tipoInmueble === filtros.tipoInmueble;
      const coincideVistaRapida =
        filtros.vistaRapida === 'TODOS' ||
        (filtros.vistaRapida === 'PENDIENTES' && inmueble.estatus === 'PENDIENTE_REVISION') ||
        (filtros.vistaRapida === 'BORRADORES' && ['BORRADOR', 'RECHAZADO'].includes(inmueble.estatus)) ||
        (filtros.vistaRapida === 'PUBLICADOS' && ['DISPONIBLE', 'APARTADO', 'VENDIDO'].includes(inmueble.estatus));

      return coincideBusqueda && coincideEstatus && coincideTipo && coincideVistaRapida;
    });
  }, [filtros, inmuebles]);

  const actualizarFiltro = (event) => {
    const { name, value } = event.target;
    setFiltros((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

  const limpiarFiltros = () => setFiltros(FILTROS_INICIALES);

  const ejecutarAccion = async (inmuebleId, accion, textoExito) => {
    setAccionando(inmuebleId);
    setError('');
    setMensaje('');

    try {
      await accion();
      setMensaje(textoExito);
      await cargarInmuebles();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionando('');
    }
  };

  const renderAccionesWorkflow = (inmueble) => {
    if (!inmueble.id) {
      return null;
    }

    const disabled = accionando === inmueble.id;

    if (['BORRADOR', 'RECHAZADO'].includes(inmueble.estatus) && puedeEnviarRevision) {
      return (
        <button
          type="button"
          onClick={() => ejecutarAccion(
            inmueble.id,
            () => enviarRevisionInmueble(inmueble.id),
            'Inmueble enviado a revision.'
          )}
          disabled={disabled}
        >
          {disabled ? 'Procesando...' : 'Enviar a revision'}
        </button>
      );
    }

    if (inmueble.estatus === 'PENDIENTE_REVISION' && puedeAprobar) {
      return (
        <>
          <button
            type="button"
            onClick={() => ejecutarAccion(
              inmueble.id,
              () => publicarInmueble(inmueble.id),
              'Inmueble publicado.'
            )}
            disabled={disabled}
          >
            Publicar
          </button>
          <button
            type="button"
            className="is-danger"
            onClick={() => ejecutarAccion(
              inmueble.id,
              () => rechazarInmueble(inmueble.id),
              'Inmueble rechazado.'
            )}
            disabled={disabled}
          >
            Rechazar
          </button>
        </>
      );
    }

    if (inmueble.estatus === 'DISPONIBLE' && puedeAprobar) {
      return ESTATUS_CAMBIO_DIRECTO.map((estatus) => (
        <button
          key={estatus}
          type="button"
          onClick={() => ejecutarAccion(
            inmueble.id,
            () => cambiarEstatusInmueble(inmueble.id, estatus),
            `Estatus cambiado a ${estatus}.`
          )}
          disabled={disabled}
        >
          {estatus}
        </button>
      ));
    }

    return null;
  };

  return (
    <main className="admin-propiedades">
      <section className="admin-propiedades-hero">
        <div>
          <p className="admin-propiedades-eyebrow">Administracion</p>
          <h1>Propiedades</h1>
        </div>
        <Link className="admin-propiedades-primary" to="/admin/inmuebles/nuevo">
          Nuevo inmueble
        </Link>
      </section>

      {puedeAprobar ? (
        <section className="admin-propiedades-aprobacion">
          <strong>Pendientes de aprobacion</strong>
          <span>{inmuebles.filter((inmueble) => inmueble.estatus === 'PENDIENTE_REVISION').length}</span>
        </section>
      ) : null}

      <section className="admin-propiedades-tabs" aria-label="Filtros rapidos">
        {VISTAS_RAPIDAS.map((vista) => (
          <button
            key={vista.id}
            type="button"
            className={filtros.vistaRapida === vista.id ? 'is-active' : ''}
            onClick={() => setFiltros((actual) => ({ ...actual, vistaRapida: vista.id }))}
          >
            {vista.label}
          </button>
        ))}
      </section>

      <section className="admin-propiedades-filtros">
        <label>
          <span>Buscar por titulo</span>
          <input name="busqueda" value={filtros.busqueda} onChange={actualizarFiltro} />
        </label>
        <label>
          <span>Estatus</span>
          <select name="estatus" value={filtros.estatus} onChange={actualizarFiltro}>
            <option value="">Todos</option>
            {estatusDisponibles.map((estatus) => (
              <option key={estatus} value={estatus}>{ESTATUS_LABELS[estatus] || estatus}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Tipo inmueble</span>
          <select name="tipoInmueble" value={filtros.tipoInmueble} onChange={actualizarFiltro}>
            <option value="">Todos</option>
            {tiposDisponibles.map((tipo) => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={limpiarFiltros}>Limpiar</button>
      </section>

      {cargando ? <p className="admin-propiedades-feedback">Cargando inmuebles...</p> : null}
      {mensaje ? <p className="admin-propiedades-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="admin-propiedades-feedback is-error">{error}</p> : null}

      {!cargando && !error ? (
        <section className="admin-propiedades-card">
          {inmueblesFiltrados.length === 0 ? (
            <p className="admin-propiedades-empty">No hay inmuebles con los filtros seleccionados.</p>
          ) : (
            <div className="admin-propiedades-table-wrap">
              <table className="admin-propiedades-table">
                <thead>
                  <tr>
                    <th>Imagen</th>
                    <th>Titulo</th>
                    <th>Tipo</th>
                    <th>Precio</th>
                    <th>Ubicacion</th>
                    <th>Asesor/Propietario</th>
                    <th>Estatus</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inmueblesFiltrados.map((inmueble) => (
                    <tr key={inmueble.id}>
                      <td data-label="Imagen">
                        {inmueble.imagenPrincipal ? (
                          <img className="admin-propiedades-img" src={inmueble.imagenPrincipal} alt="" />
                        ) : (
                          <span className="admin-propiedades-img-placeholder">Sin imagen</span>
                        )}
                      </td>
                      <td data-label="Titulo"><strong>{inmueble.titulo}</strong></td>
                      <td data-label="Tipo">{inmueble.tipoInmueble}</td>
                      <td data-label="Precio">{inmueble.precio}</td>
                      <td data-label="Ubicacion">{inmueble.ubicacion}</td>
                      <td data-label="Asesor/Propietario">
                        <div className="admin-propiedades-asesor">
                          <strong>{inmueble.asesorNombre || 'Sin nombre'}</strong>
                          {inmueble.asesorEmail ? <span>{inmueble.asesorEmail}</span> : null}
                          {!inmueble.asesorEmail && inmueble.usuarioId ? <span>ID usuario: {inmueble.usuarioId}</span> : null}
                        </div>
                      </td>
                      <td data-label="Estatus">
                        <span className={`admin-propiedades-pill is-${inmueble.estatus.toLowerCase()}`}>
                          {ESTATUS_LABELS[inmueble.estatus] || inmueble.estatus}
                        </span>
                      </td>
                      <td data-label="Fecha">{inmueble.fechaCreacion}</td>
                      <td data-label="Acciones">
                        <div className="admin-propiedades-actions">
                          {inmueble.id ? (
                            <>
                              <Link to={`/admin/inmuebles/editar/${inmueble.id}`}>Editar</Link>
                              <Link to={`/admin/inmuebles/${inmueble.id}/imagenes`}>Imagenes</Link>
                              <Link to={`/admin/tours360/${inmueble.id}`}>Tour 360</Link>
                              <Link to={`/propiedad/${inmueble.id}`}>Ver publico</Link>
                              {renderAccionesWorkflow(inmueble)}
                            </>
                          ) : (
                            <span>Sin ID</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
