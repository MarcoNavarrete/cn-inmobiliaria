import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  actualizarEstatusProspecto,
  agregarNotaProspecto,
  listarNotasProspecto,
} from '../services/adminProspectosService';
import {
  obtenerProspectos,
} from '../services/prospectosService';
import './AdminProspectosPage.css';

const ESTATUS_PROSPECTO = ['NUEVO', 'CONTACTADO', 'INTERESADO', 'VISITA_AGENDADA', 'DESCARTADO', 'CERRADO'];

const TIPOS_PROSPECTO = {
  INMUEBLE: 'Propiedad',
  DESARROLLO: 'Desarrollo',
  MODELO_DESARROLLO: 'Modelo',
};

const FILTROS_TIPO = [
  { label: 'Todos', value: '' },
  { label: 'Propiedades', value: 'INMUEBLE' },
  { label: 'Desarrollos', value: 'DESARROLLO' },
  { label: 'Modelos', value: 'MODELO_DESARROLLO' },
];

const FILTROS_INICIALES = {
  busqueda: '',
  tipoProspecto: '',
  origen: '',
  estatus: '',
  desde: '',
  hasta: '',
};

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible cargar prospectos.';

const normalizarTexto = (value) => String(value || '').trim().toLowerCase();

const getTipoLabel = (tipoProspecto) => TIPOS_PROSPECTO[tipoProspecto] || 'Prospecto';

const getCssSuffix = (value) => String(value || '').toLowerCase().replace(/_/g, '-');

const getEstatusOpciones = (estatusActual) =>
  ESTATUS_PROSPECTO.includes(estatusActual)
    ? ESTATUS_PROSPECTO
    : [estatusActual, ...ESTATUS_PROSPECTO].filter(Boolean);

const getContextoProspecto = (prospecto) => {
  if (prospecto.tipoProspecto === 'DESARROLLO') {
    return prospecto.desarrolloNombre || 'Desarrollo sin nombre';
  }

  if (prospecto.tipoProspecto === 'MODELO_DESARROLLO') {
    return [
      prospecto.desarrolloNombre || 'Desarrollo sin nombre',
      prospecto.modeloNombre || 'Modelo sin nombre',
    ].join(' - ');
  }

  return prospecto.tituloInmueble;
};

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
  const [notasModal, setNotasModal] = useState({
    isOpen: false,
    prospecto: null,
    notas: [],
    nuevaNota: '',
    cargando: false,
    guardando: false,
    error: '',
  });
  const [vista, setVista] = useState('tabla');
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
        prospecto.desarrolloNombre,
        prospecto.modeloNombre,
      ].join(' '));
      const fecha = fechaComparable(prospecto.fechaFiltro);

      const coincideBusqueda = !busqueda || textoBusqueda.includes(busqueda);
      const coincideTipo = !filtros.tipoProspecto || prospecto.tipoProspecto === filtros.tipoProspecto;
      const coincideOrigen = !filtros.origen || prospecto.origen === filtros.origen;
      const coincideEstatus = !filtros.estatus || prospecto.estatus === filtros.estatus;
      const coincideDesde = !filtros.desde || (fecha && fecha >= filtros.desde);
      const coincideHasta = !filtros.hasta || (fecha && fecha <= filtros.hasta);

      return coincideBusqueda && coincideTipo && coincideOrigen && coincideEstatus && coincideDesde && coincideHasta;
    });
  }, [filtros, prospectos]);

  const prospectosPorEstatus = useMemo(
    () =>
      ESTATUS_PROSPECTO.reduce((acc, estatus) => ({
        ...acc,
        [estatus]: prospectosFiltrados.filter((prospecto) => prospecto.estatus === estatus),
      }), {}),
    [prospectosFiltrados]
  );

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

  const cambiarEstatus = async (prospecto, estatus) => {
    setAccionando(`${prospecto.id}-estatus`);
    setError('');
    setMensaje('');

    try {
      await actualizarEstatusProspecto(prospecto.tipoProspecto, prospecto.id, estatus);
      actualizarProspectoLocal(prospecto.id, { estatus });
      setMensaje('Estatus actualizado.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionando('');
    }
  };

  const cerrarNotas = () => {
    setNotasModal({
      isOpen: false,
      prospecto: null,
      notas: [],
      nuevaNota: '',
      cargando: false,
      guardando: false,
      error: '',
    });
  };

  const abrirNotas = async (prospecto) => {
    setNotasModal({
      isOpen: true,
      prospecto,
      notas: [],
      nuevaNota: '',
      cargando: true,
      guardando: false,
      error: '',
    });

    try {
      const notas = await listarNotasProspecto(prospecto.tipoProspecto, prospecto.id);
      setNotasModal((actual) => ({
        ...actual,
        notas,
        cargando: false,
      }));
    } catch (err) {
      setNotasModal((actual) => ({
        ...actual,
        cargando: false,
        error: getApiErrorMessage(err),
      }));
    }
  };

  const cambiarNuevaNota = (event) => {
    setNotasModal((actual) => ({
      ...actual,
      nuevaNota: event.target.value,
      error: '',
    }));
  };

  const agregarNota = async () => {
    const nota = notasModal.nuevaNota.trim();

    if (!nota) {
      setNotasModal((actual) => ({
        ...actual,
        error: 'La nota es requerida.',
      }));
      return;
    }

    setNotasModal((actual) => ({
      ...actual,
      guardando: true,
      error: '',
    }));

    try {
      await agregarNotaProspecto(notasModal.prospecto.tipoProspecto, notasModal.prospecto.id, nota);
      const notas = await listarNotasProspecto(notasModal.prospecto.tipoProspecto, notasModal.prospecto.id);
      setNotasModal((actual) => ({
        ...actual,
        notas,
        nuevaNota: '',
        guardando: false,
      }));
      actualizarProspectoLocal(notasModal.prospecto.id, { notas: nota });
      setMensaje('Nota agregada.');
    } catch (err) {
      setNotasModal((actual) => ({
        ...actual,
        guardando: false,
        error: getApiErrorMessage(err),
      }));
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
            placeholder="Nombre, telefono, email, inmueble o desarrollo"
          />
        </label>
        <label>
          <span>Tipo</span>
          <select name="tipoProspecto" value={filtros.tipoProspecto} onChange={actualizarFiltro}>
            {FILTROS_TIPO.map((filtro) => (
              <option key={filtro.label} value={filtro.value}>{filtro.label}</option>
            ))}
          </select>
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

      <section className="admin-prospectos-vistas" aria-label="Vista de prospectos">
        <button
          type="button"
          className={vista === 'tabla' ? 'is-active' : ''}
          onClick={() => setVista('tabla')}
        >
          Tabla
        </button>
        <button
          type="button"
          className={vista === 'kanban' ? 'is-active' : ''}
          onClick={() => setVista('kanban')}
        >
          Kanban
        </button>
      </section>

      {cargando ? <p className="admin-prospectos-feedback">Cargando prospectos...</p> : null}
      {mensaje ? <p className="admin-prospectos-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="admin-prospectos-feedback is-error">{error}</p> : null}

      {!cargando && !error ? (
        <section className="admin-prospectos-card">
          {prospectosFiltrados.length === 0 ? (
            <p className="admin-prospectos-empty">No hay prospectos con los filtros seleccionados.</p>
          ) : vista === 'kanban' ? (
            <div className="admin-prospectos-kanban">
              {ESTATUS_PROSPECTO.map((estatus) => (
                <section key={estatus} className="admin-prospectos-kanban-col">
                  <div className="admin-prospectos-kanban-head">
                    <strong>{estatus}</strong>
                    <span>{prospectosPorEstatus[estatus]?.length || 0}</span>
                  </div>
                  <div className="admin-prospectos-kanban-list">
                    {(prospectosPorEstatus[estatus] || []).map((prospecto) => (
                      <article key={prospecto.id || `${prospecto.email}-${prospecto.fechaFiltro}`} className="admin-prospectos-kanban-card">
                        <div>
                          <strong>{prospecto.nombre}</strong>
                          <span>{prospecto.fechaCreacion}</span>
                        </div>
                        <div className="admin-prospectos-kanban-contacto">
                          <span>{prospecto.telefono}</span>
                          <span>{prospecto.email}</span>
                        </div>
                        <span className={`admin-prospectos-tipo is-${prospecto.tipoProspecto.toLowerCase()}`}>
                          {getTipoLabel(prospecto.tipoProspecto)}
                        </span>
                        <p>{getContextoProspecto(prospecto)}</p>
                        <small>{prospecto.notas}</small>
                        <span className={`admin-prospectos-estatus-badge is-${getCssSuffix(prospecto.estatus)}`}>
                          {prospecto.estatus}
                        </span>
                        <select
                          value={prospecto.estatus}
                          onChange={(event) => cambiarEstatus(prospecto, event.target.value)}
                          disabled={!prospecto.id || accionando === `${prospecto.id}-estatus`}
                        >
                          {getEstatusOpciones(prospecto.estatus).map((opcion) => (
                            <option key={opcion} value={opcion}>{opcion}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="admin-prospectos-notas-btn"
                          onClick={() => abrirNotas(prospecto)}
                          disabled={!prospecto.id}
                        >
                          Notas
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="admin-prospectos-table-wrap">
              <table className="admin-prospectos-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Prospecto</th>
                    <th>Contacto</th>
                    <th>Interes</th>
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
                      <td>
                        <div className="admin-prospectos-contexto">
                          <span className={`admin-prospectos-tipo is-${prospecto.tipoProspecto.toLowerCase()}`}>
                            {getTipoLabel(prospecto.tipoProspecto)}
                          </span>
                          <strong>{getContextoProspecto(prospecto)}</strong>
                        </div>
                      </td>
                      <td><span className="admin-prospectos-pill">{prospecto.origen}</span></td>
                      <td>
                        <span className={`admin-prospectos-estatus-badge is-${getCssSuffix(prospecto.estatus)}`}>
                          {prospecto.estatus}
                        </span>
                        <select
                          className="admin-prospectos-estatus"
                          value={prospecto.estatus}
                          onChange={(event) => cambiarEstatus(prospecto, event.target.value)}
                          disabled={!prospecto.id || accionando === `${prospecto.id}-estatus`}
                        >
                          {getEstatusOpciones(prospecto.estatus).map((estatus) => (
                            <option key={estatus} value={estatus}>{estatus}</option>
                          ))}
                        </select>
                      </td>
                      <td className="admin-prospectos-notas">
                        <button
                          type="button"
                          className="admin-prospectos-notas-btn"
                          onClick={() => abrirNotas(prospecto)}
                          disabled={!prospecto.id}
                        >
                          Notas
                        </button>
                        <small>{prospecto.notas}</small>
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

      {notasModal.isOpen ? (
        <div className="admin-prospectos-notas-overlay" role="presentation" onMouseDown={cerrarNotas}>
          <aside
            className="admin-prospectos-notas-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-prospectos-notas-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="admin-prospectos-notas-head">
              <div>
                <p className="admin-prospectos-eyebrow">Seguimiento comercial</p>
                <h2 id="admin-prospectos-notas-title">Notas</h2>
                <span>{notasModal.prospecto?.nombre} - {getContextoProspecto(notasModal.prospecto || {})}</span>
              </div>
              <button type="button" onClick={cerrarNotas} aria-label="Cerrar notas">x</button>
            </div>

            {notasModal.cargando ? (
              <p className="admin-prospectos-feedback">Cargando notas...</p>
            ) : null}

            {notasModal.error ? (
              <p className="admin-prospectos-feedback is-error">{notasModal.error}</p>
            ) : null}

            {!notasModal.cargando ? (
              <div className="admin-prospectos-notas-list">
                {notasModal.notas.length === 0 ? (
                  <p className="admin-prospectos-empty">Sin notas registradas.</p>
                ) : notasModal.notas.map((nota) => (
                  <article key={nota.id || `${nota.fecha}-${nota.nota}`} className="admin-prospectos-nota-item">
                    <div>
                      <strong>{nota.usuario}</strong>
                      <span>{nota.fecha}</span>
                    </div>
                    <p>{nota.nota}</p>
                  </article>
                ))}
              </div>
            ) : null}

            <div className="admin-prospectos-nota-form">
              <label>
                <span>Nueva nota</span>
                <textarea
                  value={notasModal.nuevaNota}
                  onChange={cambiarNuevaNota}
                  rows="4"
                  disabled={notasModal.guardando}
                  placeholder="Escribe el seguimiento realizado"
                />
              </label>
              <button type="button" onClick={agregarNota} disabled={notasModal.guardando}>
                {notasModal.guardando ? 'Agregando...' : 'Agregar nota'}
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
