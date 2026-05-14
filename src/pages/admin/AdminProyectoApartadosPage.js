import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  actualizarEstatusApartado,
  crearApartado,
  listarApartados,
} from '../../services/proyectoApartadosService';
import { listarUnidades } from '../../services/proyectoUnidadesService';
import { listarProyectos } from '../../services/proyectosInmobiliariosService';
import './AdminProyectoApartadosPage.css';

const ESTATUS_APARTADO = ['VIGENTE', 'VENCIDO', 'CANCELADO', 'CONVERTIDO'];

const FILTROS_INICIALES = {
  proyectoId: '',
  estatus: '',
};

const FORM_INICIAL = {
  proyectoId: '',
  unidadId: '',
  prospectoId: '',
  montoApartado: '',
  fechaApartado: '',
  fechaVencimiento: '',
  observaciones: '',
};

const FORM_ESTATUS_INICIAL = {
  estatus: 'VIGENTE',
  observaciones: '',
};

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible procesar la accion.';

const toNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
};

const buildPayload = (form) => ({
  unidadId: toNumberOrNull(form.unidadId),
  prospectoId: toNumberOrNull(form.prospectoId),
  montoApartado: toNumberOrNull(form.montoApartado),
  fechaApartado: form.fechaApartado || null,
  fechaVencimiento: form.fechaVencimiento || null,
  observaciones: form.observaciones.trim() || null,
});

export default function AdminProyectoApartadosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [proyectos, setProyectos] = useState([]);
  const [apartados, setApartados] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [filtros, setFiltros] = useState({
    ...FILTROS_INICIALES,
    proyectoId: searchParams.get('proyectoId') || '',
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEstatusOpen, setModalEstatusOpen] = useState(false);
  const [apartadoEditando, setApartadoEditando] = useState(null);
  const [form, setForm] = useState({
    ...FORM_INICIAL,
    proyectoId: searchParams.get('proyectoId') || '',
  });
  const [formEstatus, setFormEstatus] = useState(FORM_ESTATUS_INICIAL);
  const [cargando, setCargando] = useState(true);
  const [cargandoUnidades, setCargandoUnidades] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarDatos = useCallback(async (options = {}) => {
    setCargando(true);
    setError('');

    try {
      const [proyectosData, apartadosData] = await Promise.all([
        listarProyectos({ soloActivos: true, signal: options.signal }),
        listarApartados({
          proyectoId: filtros.proyectoId,
          estatus: filtros.estatus,
          signal: options.signal,
        }),
      ]);

      setProyectos(proyectosData);
      setApartados(apartadosData);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(getApiErrorMessage(err));
      }
    } finally {
      if (!options.signal?.aborted) {
        setCargando(false);
      }
    }
  }, [filtros]);

  useEffect(() => {
    const controller = new AbortController();
    cargarDatos({ signal: controller.signal });
    return () => controller.abort();
  }, [cargarDatos]);

  const cargarUnidadesProyecto = useCallback(async (proyectoId, options = {}) => {
    if (!proyectoId) {
      setUnidades([]);
      return;
    }

    setCargandoUnidades(true);
    try {
      const data = await listarUnidades(proyectoId, { soloActivas: true, signal: options.signal });
      setUnidades(data);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(getApiErrorMessage(err));
      }
    } finally {
      if (!options.signal?.aborted) {
        setCargandoUnidades(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (modalOpen && form.proyectoId) {
      cargarUnidadesProyecto(form.proyectoId, { signal: controller.signal });
    }
    return () => controller.abort();
  }, [cargarUnidadesProyecto, form.proyectoId, modalOpen]);

  const proyectoSeleccionado = useMemo(
    () => proyectos.find((proyecto) => String(proyecto.id) === String(filtros.proyectoId)),
    [filtros.proyectoId, proyectos]
  );

  const unidadSeleccionada = useMemo(
    () => unidades.find((unidad) => String(unidad.id) === String(form.unidadId)),
    [form.unidadId, unidades]
  );

  const actualizarFiltro = (event) => {
    const { name, value } = event.target;
    setFiltros((actual) => ({ ...actual, [name]: value }));
  };

  const aplicarFiltros = (event) => {
    event.preventDefault();
    const next = {};
    if (filtros.proyectoId) next.proyectoId = filtros.proyectoId;
    setSearchParams(next);
    cargarDatos();
  };

  const abrirNuevoApartado = () => {
    const proyectoId = filtros.proyectoId || '';
    setForm({ ...FORM_INICIAL, proyectoId });
    setUnidades([]);
    setError('');
    setModalOpen(true);
    if (proyectoId) cargarUnidadesProyecto(proyectoId);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModalOpen(false);
    setForm(FORM_INICIAL);
    setUnidades([]);
  };

  const abrirCambioEstatus = (apartado) => {
    setApartadoEditando(apartado);
    setFormEstatus({
      estatus: apartado.estatus || 'VIGENTE',
      observaciones: apartado.observaciones || '',
    });
    setError('');
    setModalEstatusOpen(true);
  };

  const cerrarModalEstatus = () => {
    if (guardando) return;
    setModalEstatusOpen(false);
    setApartadoEditando(null);
    setFormEstatus(FORM_ESTATUS_INICIAL);
  };

  const actualizarCampo = (event) => {
    const { name, value } = event.target;
    setForm((actual) => ({
      ...actual,
      [name]: value,
      ...(name === 'proyectoId' ? { unidadId: '' } : {}),
    }));
  };

  const validar = () => {
    if (!form.proyectoId) return 'Selecciona el proyecto.';
    if (!form.unidadId) return 'Selecciona la unidad.';
    if (form.montoApartado !== '' && Number(form.montoApartado) < 0) return 'El monto de apartado no puede ser negativo.';
    return '';
  };

  const guardarApartado = async (event) => {
    event.preventDefault();
    setError('');
    setMensaje('');

    const validacion = validar();
    if (validacion) {
      setError(validacion);
      return;
    }

    setGuardando(true);

    try {
      await crearApartado(form.proyectoId, buildPayload(form));
      setMensaje('Apartado creado correctamente.');
      cerrarModal();
      await cargarDatos();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  const guardarEstatus = async (event) => {
    event.preventDefault();
    if (!apartadoEditando?.id) return;

    if (['CANCELADO', 'VENCIDO'].includes(formEstatus.estatus) && !window.confirm('Si la unidad sigue en APARTADO, volvera a DISPONIBLE. Continuar?')) {
      return;
    }

    if (formEstatus.estatus === 'CONVERTIDO' && !window.confirm('La unidad pasara a EN_PROCESO. Continuar?')) {
      return;
    }

    setGuardando(true);
    setError('');
    setMensaje('');

    try {
      await actualizarEstatusApartado(apartadoEditando.id, {
        estatus: formEstatus.estatus,
        observaciones: formEstatus.observaciones.trim() || null,
      });
      setMensaje('Estatus del apartado actualizado correctamente.');
      cerrarModalEstatus();
      await cargarDatos();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="admin-proyecto-apartados">
      <section className="admin-proyecto-apartados-hero">
        <div>
          <p className="admin-proyecto-apartados-eyebrow">Proyectos inmobiliarios</p>
          <h1>Apartados operativos</h1>
          {proyectoSeleccionado ? <span>{proyectoSeleccionado.nombre} - {proyectoSeleccionado.empresaNombre}</span> : null}
        </div>
        <div className="admin-proyecto-apartados-hero-actions">
          <Link to="/admin/proyectos-inmobiliarios">Volver al listado</Link>
          {filtros.proyectoId ? <Link to={`/admin/proyectos-inmobiliarios/${filtros.proyectoId}/unidades`}>Unidades</Link> : null}
          <Link to="/admin/proyectos-inmobiliarios/prospectos">Prospectos</Link>
          <button type="button" onClick={abrirNuevoApartado}>Nuevo apartado</button>
        </div>
      </section>

      <p className="admin-proyecto-apartados-security">
        Los apartados son un control operativo. No sustituyen recibos, contratos ni validacion legal. Esta pantalla no registra pagos formales ni sube comprobantes.
      </p>

      <form className="admin-proyecto-apartados-filtros" onSubmit={aplicarFiltros}>
        <label>
          <span>Proyecto</span>
          <select name="proyectoId" value={filtros.proyectoId} onChange={actualizarFiltro}>
            <option value="">Todos</option>
            {proyectos.map((proyecto) => <option key={proyecto.id} value={proyecto.id}>{proyecto.nombre}</option>)}
          </select>
        </label>
        <label>
          <span>Estatus</span>
          <select name="estatus" value={filtros.estatus} onChange={actualizarFiltro}>
            <option value="">Todos</option>
            {ESTATUS_APARTADO.map((estatus) => <option key={estatus} value={estatus}>{estatus}</option>)}
          </select>
        </label>
        <button type="submit">Recargar</button>
      </form>

      {cargando ? <p className="admin-proyecto-apartados-feedback">Cargando apartados...</p> : null}
      {mensaje ? <p className="admin-proyecto-apartados-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="admin-proyecto-apartados-feedback is-error">{error}</p> : null}

      {!cargando ? (
        <section className="admin-proyecto-apartados-card">
          {apartados.length === 0 ? (
            <p className="admin-proyecto-apartados-empty">Aun no hay apartados registrados.</p>
          ) : (
            <div className="admin-proyecto-apartados-table-wrap">
              <table className="admin-proyecto-apartados-table">
                <thead>
                  <tr>
                    <th>Fecha apartado</th>
                    <th>Fecha vencimiento</th>
                    <th>Proyecto</th>
                    <th>Unidad</th>
                    <th>Prospecto</th>
                    <th>Empresa</th>
                    <th>Monto apartado</th>
                    <th>Estatus</th>
                    <th>Observaciones</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {apartados.map((apartado) => (
                    <tr key={apartado.id}>
                      <td>{apartado.fechaApartado}</td>
                      <td>{apartado.fechaVencimiento}</td>
                      <td>{apartado.proyectoNombre}</td>
                      <td>{apartado.unidadCodigo}</td>
                      <td>{apartado.prospectoNombre}</td>
                      <td>{apartado.empresaNombre}</td>
                      <td>{apartado.montoApartadoTexto}</td>
                      <td><span className={`admin-proyecto-apartados-status is-${apartado.estatus.toLowerCase()}`}>{apartado.estatus}</span></td>
                      <td>{apartado.observaciones || '-'}</td>
                      <td>
                        <div className="admin-proyecto-apartados-actions">
                          <button type="button" onClick={() => abrirCambioEstatus(apartado)}>Cambiar estatus</button>
                          {apartado.proyectoId ? <Link to={`/admin/proyectos-inmobiliarios/${apartado.proyectoId}/unidades`}>Ver unidades</Link> : null}
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

      {modalOpen ? (
        <div className="admin-proyecto-apartados-modal-overlay" role="presentation" onMouseDown={cerrarModal}>
          <section className="admin-proyecto-apartados-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-proyecto-apartados-modal-head">
              <div>
                <p className="admin-proyecto-apartados-eyebrow">Apartado</p>
                <h2>Nuevo apartado operativo</h2>
              </div>
              <button type="button" onClick={cerrarModal} disabled={guardando} aria-label="Cerrar">x</button>
            </div>
            <form onSubmit={guardarApartado}>
              <div className="admin-proyecto-apartados-form-grid">
                <label>
                  <span>Proyecto</span>
                  <select name="proyectoId" value={form.proyectoId} onChange={actualizarCampo} required>
                    <option value="">Selecciona proyecto</option>
                    {proyectos.map((proyecto) => <option key={proyecto.id} value={proyecto.id}>{proyecto.nombre}</option>)}
                  </select>
                </label>
                <label>
                  <span>Unidad</span>
                  <select name="unidadId" value={form.unidadId} onChange={actualizarCampo} required disabled={!form.proyectoId || cargandoUnidades}>
                    <option value="">{cargandoUnidades ? 'Cargando unidades...' : 'Selecciona unidad'}</option>
                    {unidades.map((unidad) => (
                      <option key={unidad.id} value={unidad.id}>
                        {unidad.codigo} - {unidad.tipoUnidad} {unidad.manzana ? `Mza ${unidad.manzana}` : ''} {unidad.lote ? `Lote ${unidad.lote}` : ''} - {unidad.estatus}
                      </option>
                    ))}
                  </select>
                </label>
                {unidadSeleccionada && unidadSeleccionada.estatus !== 'DISPONIBLE' ? (
                  <p className="admin-proyecto-apartados-warning is-full">
                    La unidad seleccionada esta en estatus {unidadSeleccionada.estatus}. El backend validara si puede apartarse.
                  </p>
                ) : null}
                <label><span>ProspectoId</span><input name="prospectoId" type="number" min="0" value={form.prospectoId} onChange={actualizarCampo} /></label>
                <label><span>Monto apartado</span><input name="montoApartado" type="number" min="0" step="0.01" value={form.montoApartado} onChange={actualizarCampo} /></label>
                <label><span>Fecha apartado</span><input name="fechaApartado" type="date" value={form.fechaApartado} onChange={actualizarCampo} /></label>
                <label><span>Fecha vencimiento</span><input name="fechaVencimiento" type="date" value={form.fechaVencimiento} onChange={actualizarCampo} /></label>
                <label className="is-full"><span>Observaciones</span><textarea name="observaciones" value={form.observaciones} onChange={actualizarCampo} rows="4" /></label>
              </div>
              <div className="admin-proyecto-apartados-modal-actions">
                <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar apartado'}</button>
                <button type="button" onClick={cerrarModal} disabled={guardando}>Cancelar</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {modalEstatusOpen ? (
        <div className="admin-proyecto-apartados-modal-overlay" role="presentation" onMouseDown={cerrarModalEstatus}>
          <section className="admin-proyecto-apartados-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-proyecto-apartados-modal-head">
              <div>
                <p className="admin-proyecto-apartados-eyebrow">Apartado</p>
                <h2>Cambiar estatus</h2>
              </div>
              <button type="button" onClick={cerrarModalEstatus} disabled={guardando} aria-label="Cerrar">x</button>
            </div>
            <form onSubmit={guardarEstatus}>
              <div className="admin-proyecto-apartados-form-grid">
                <label>
                  <span>Estatus</span>
                  <select value={formEstatus.estatus} onChange={(event) => setFormEstatus((actual) => ({ ...actual, estatus: event.target.value }))}>
                    {ESTATUS_APARTADO.map((estatus) => <option key={estatus} value={estatus}>{estatus}</option>)}
                  </select>
                </label>
                <label className="is-full">
                  <span>Observaciones</span>
                  <textarea value={formEstatus.observaciones} onChange={(event) => setFormEstatus((actual) => ({ ...actual, observaciones: event.target.value }))} rows="4" />
                </label>
              </div>
              <div className="admin-proyecto-apartados-modal-actions">
                <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
                <button type="button" onClick={cerrarModalEstatus} disabled={guardando}>Cancelar</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
