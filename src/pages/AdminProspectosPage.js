import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  actualizarEstatusProspecto,
  actualizarNotasProspecto,
  obtenerProspectos,
} from '../services/prospectosService';
import './AdminProspectosPage.css';

const ESTATUS_PROSPECTO = ['NUEVO', 'CONTACTADO', 'VISITA_AGENDADA', 'INTERESADO', 'CERRADO', 'PERDIDO'];

const FILTROS_INICIALES = {
  busqueda: '',
  origen: '',
  estatus: '',
  desde: '',
  hasta: '',
};

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible cargar prospectos.';

const normalizarTexto = (value) => String(value || '').trim().toLowerCase();

const fechaComparable = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
};

export default function AdminProspectosPage() {
  const [prospectos, setProspectos] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [notasEditables, setNotasEditables] = useState({});
  const [cargando, setCargando] = useState(true);
  const [accionando, setAccionando] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const cargarProspectos = async () => {
      setCargando(true);
      setError('');

      try {
        const data = await obtenerProspectos({ signal: controller.signal });
        setProspectos(data);
        setNotasEditables(
          data.reduce((acc, prospecto) => ({
            ...acc,
            [prospecto.id]: prospecto.notas,
          }), {})
        );
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    };

    cargarProspectos();

    return () => controller.abort();
  }, []);

  const origenesDisponibles = useMemo(
    () => [...new Set(prospectos.map((item) => item.origen).filter(Boolean))].sort(),
    [prospectos]
  );

  const prospectosFiltrados = useMemo(() => {
    const busqueda = normalizarTexto(filtros.busqueda);

    return prospectos.filter((prospecto) => {
      const textoBusqueda = normalizarTexto([
        prospecto.nombre,
        prospecto.telefono,
        prospecto.email,
        prospecto.tituloInmueble,
      ].join(' '));
      const fecha = fechaComparable(prospecto.fechaFiltro);

      const coincideBusqueda = !busqueda || textoBusqueda.includes(busqueda);
      const coincideOrigen = !filtros.origen || prospecto.origen === filtros.origen;
      const coincideEstatus = !filtros.estatus || prospecto.estatus === filtros.estatus;
      const coincideDesde = !filtros.desde || (fecha && fecha >= filtros.desde);
      const coincideHasta = !filtros.hasta || (fecha && fecha <= filtros.hasta);

      return coincideBusqueda && coincideOrigen && coincideEstatus && coincideDesde && coincideHasta;
    });
  }, [filtros, prospectos]);

  const actualizarFiltro = (event) => {
    const { name, value } = event.target;
    setFiltros((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

  const limpiarFiltros = () => setFiltros(FILTROS_INICIALES);

  const actualizarProspectoLocal = (prospectoId, cambios) => {
    setProspectos((actuales) =>
      actuales.map((prospecto) =>
        prospecto.id === prospectoId
          ? { ...prospecto, ...cambios }
          : prospecto
      )
    );
  };

  const cambiarEstatus = async (prospectoId, estatus) => {
    setAccionando(`${prospectoId}-estatus`);
    setError('');
    setMensaje('');

    try {
      await actualizarEstatusProspecto(prospectoId, estatus);
      actualizarProspectoLocal(prospectoId, { estatus });
      setMensaje('Estatus actualizado.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionando('');
    }
  };

  const cambiarNotaLocal = (prospectoId, notas) => {
    setNotasEditables((actuales) => ({
      ...actuales,
      [prospectoId]: notas,
    }));
  };

  const guardarNotas = async (prospectoId) => {
    const notas = notasEditables[prospectoId] || '';
    setAccionando(`${prospectoId}-notas`);
    setError('');
    setMensaje('');

    try {
      await actualizarNotasProspecto(prospectoId, notas);
      actualizarProspectoLocal(prospectoId, { notas });
      setMensaje('Notas actualizadas.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionando('');
    }
  };

  return (
    <main className="admin-prospectos">
      <section className="admin-prospectos-hero">
        <div>
          <p className="admin-prospectos-eyebrow">Administracion</p>
          <h1>Prospectos</h1>
        </div>
        <Link className="admin-prospectos-primary" to="/admin/propiedades">
          Ver propiedades
        </Link>
      </section>

      <section className="admin-prospectos-filtros">
        <label>
          <span>Buscar</span>
          <input
            name="busqueda"
            value={filtros.busqueda}
            onChange={actualizarFiltro}
            placeholder="Nombre, telefono, email o inmueble"
          />
        </label>
        <label>
          <span>Origen</span>
          <select name="origen" value={filtros.origen} onChange={actualizarFiltro}>
            <option value="">Todos</option>
            {origenesDisponibles.map((origen) => (
              <option key={origen} value={origen}>{origen}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Estatus</span>
          <select name="estatus" value={filtros.estatus} onChange={actualizarFiltro}>
            <option value="">Todos</option>
            {ESTATUS_PROSPECTO.map((estatus) => (
              <option key={estatus} value={estatus}>{estatus}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Desde</span>
          <input name="desde" type="date" value={filtros.desde} onChange={actualizarFiltro} />
        </label>
        <label>
          <span>Hasta</span>
          <input name="hasta" type="date" value={filtros.hasta} onChange={actualizarFiltro} />
        </label>
        <button type="button" onClick={limpiarFiltros}>Limpiar</button>
      </section>

      {cargando ? <p className="admin-prospectos-feedback">Cargando prospectos...</p> : null}
      {mensaje ? <p className="admin-prospectos-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="admin-prospectos-feedback is-error">{error}</p> : null}

      {!cargando && !error ? (
        <section className="admin-prospectos-card">
          {prospectosFiltrados.length === 0 ? (
            <p className="admin-prospectos-empty">No hay prospectos con los filtros seleccionados.</p>
          ) : (
            <div className="admin-prospectos-table-wrap">
              <table className="admin-prospectos-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Prospecto</th>
                    <th>Contacto</th>
                    <th>Inmueble</th>
                    <th>Origen</th>
                    <th>Estatus</th>
                    <th>Notas</th>
                    <th>CRM</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {prospectosFiltrados.map((prospecto) => (
                    <tr key={prospecto.id || `${prospecto.email}-${prospecto.fechaFiltro}`}>
                      <td>{prospecto.fechaCreacion}</td>
                      <td><strong>{prospecto.nombre}</strong></td>
                      <td>
                        <div className="admin-prospectos-contacto">
                          <span>{prospecto.telefono}</span>
                          <span>{prospecto.email}</span>
                        </div>
                      </td>
                      <td>{prospecto.tituloInmueble}</td>
                      <td><span className="admin-prospectos-pill">{prospecto.origen}</span></td>
                      <td>
                        <select
                          className="admin-prospectos-estatus"
                          value={prospecto.estatus}
                          onChange={(event) => cambiarEstatus(prospecto.id, event.target.value)}
                          disabled={!prospecto.id || accionando === `${prospecto.id}-estatus`}
                        >
                          {ESTATUS_PROSPECTO.map((estatus) => (
                            <option key={estatus} value={estatus}>{estatus}</option>
                          ))}
                        </select>
                      </td>
                      <td className="admin-prospectos-notas">
                        <textarea
                          value={notasEditables[prospecto.id] ?? prospecto.notas}
                          onChange={(event) => cambiarNotaLocal(prospecto.id, event.target.value)}
                          rows="3"
                          disabled={!prospecto.id || accionando === `${prospecto.id}-notas`}
                        />
                        <button
                          type="button"
                          onClick={() => guardarNotas(prospecto.id)}
                          disabled={!prospecto.id || accionando === `${prospecto.id}-notas`}
                        >
                          {accionando === `${prospecto.id}-notas` ? 'Guardando...' : 'Guardar notas'}
                        </button>
                      </td>
                      <td>
                        <div className="admin-prospectos-fechas">
                          {prospecto.fechaUltimoContacto ? (
                            <span>Ultimo contacto: {prospecto.fechaUltimoContacto}</span>
                          ) : null}
                          {prospecto.fechaActualizacion ? (
                            <span>Actualizacion: {prospecto.fechaActualizacion}</span>
                          ) : null}
                          {!prospecto.fechaUltimoContacto && !prospecto.fechaActualizacion ? (
                            <span>Sin actividad</span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        {prospecto.inmuebleId ? (
                          <div className="admin-prospectos-actions">
                            <Link to={`/propiedad/${prospecto.inmuebleId}`}>Ver propiedad</Link>
                            <Link to={`/admin/inmuebles/editar/${prospecto.inmuebleId}`}>Editar inmueble</Link>
                          </div>
                        ) : (
                          <span>Sin inmueble</span>
                        )}
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
