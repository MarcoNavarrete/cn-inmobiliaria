import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  actualizarEstatusProspecto,
  listarProspectos,
} from '../../services/proyectoProspectosService';
import { listarProyectos } from '../../services/proyectosInmobiliariosService';
import './AdminProyectoProspectosPage.css';

const ESTATUS_PROSPECTO = ['NUEVO', 'CONTACTADO', 'INTERESADO', 'APARTADO', 'DESCARTADO', 'CONVERTIDO'];

const FILTROS_INICIALES = {
  proyectoId: '',
  estatus: '',
  soloActivos: 'true',
};

const FORM_ESTATUS_INICIAL = {
  estatus: 'NUEVO',
  observaciones: '',
};

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible procesar la accion.';

const buildWhatsappUrl = (telefono) => {
  const digits = String(telefono || '').replace(/\D/g, '');
  if (!digits) return '';
  const normalized = digits.length === 10 ? `52${digits}` : digits;
  return `https://wa.me/${normalized}`;
};

export default function AdminProyectoProspectosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [proyectos, setProyectos] = useState([]);
  const [prospectos, setProspectos] = useState([]);
  const [filtros, setFiltros] = useState({
    ...FILTROS_INICIALES,
    proyectoId: searchParams.get('proyectoId') || '',
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [prospectoEditando, setProspectoEditando] = useState(null);
  const [formEstatus, setFormEstatus] = useState(FORM_ESTATUS_INICIAL);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarDatos = useCallback(async (options = {}) => {
    setCargando(true);
    setError('');

    try {
      const [proyectosData, prospectosData] = await Promise.all([
        listarProyectos({ soloActivos: true, signal: options.signal }),
        listarProspectos({
          proyectoId: filtros.proyectoId,
          estatus: filtros.estatus,
          soloActivos: filtros.soloActivos === 'true',
          signal: options.signal,
        }),
      ]);

      setProyectos(proyectosData);
      setProspectos(prospectosData);
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

  const proyectoSeleccionado = useMemo(
    () => proyectos.find((proyecto) => String(proyecto.id) === String(filtros.proyectoId)),
    [filtros.proyectoId, proyectos]
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

  const abrirCambioEstatus = (prospecto) => {
    setProspectoEditando(prospecto);
    setFormEstatus({
      estatus: prospecto.estatus || 'NUEVO',
      observaciones: prospecto.observaciones || '',
    });
    setError('');
    setModalOpen(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModalOpen(false);
    setProspectoEditando(null);
    setFormEstatus(FORM_ESTATUS_INICIAL);
  };

  const guardarEstatus = async (event) => {
    event.preventDefault();
    if (!prospectoEditando?.id) return;

    setGuardando(true);
    setError('');
    setMensaje('');

    try {
      await actualizarEstatusProspecto(prospectoEditando.id, {
        estatus: formEstatus.estatus,
        observaciones: formEstatus.observaciones.trim() || null,
      });
      setMensaje('Estatus del prospecto actualizado correctamente.');
      cerrarModal();
      await cargarDatos();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  const copiar = async (value, label) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setMensaje(`${label} copiado al portapapeles.`);
    } catch (_) {
      setMensaje(`${label}: ${value}`);
    }
  };

  return (
    <main className="admin-proyecto-prospectos">
      <section className="admin-proyecto-prospectos-hero">
        <div>
          <p className="admin-proyecto-prospectos-eyebrow">Proyectos inmobiliarios</p>
          <h1>Prospectos</h1>
          {proyectoSeleccionado ? <span>{proyectoSeleccionado.nombre} - {proyectoSeleccionado.empresaNombre}</span> : null}
        </div>
        <div className="admin-proyecto-prospectos-hero-actions">
          <Link to="/admin/proyectos-inmobiliarios">Volver al listado</Link>
          {filtros.proyectoId ? <Link to={`/admin/proyectos-inmobiliarios/${filtros.proyectoId}/editar`}>Editar proyecto</Link> : null}
          {filtros.proyectoId ? <Link to={`/admin/proyectos-inmobiliarios/${filtros.proyectoId}/unidades`}>Unidades</Link> : null}
          <Link to="/admin/proyectos-inmobiliarios/apartados">Apartados</Link>
        </div>
      </section>

      <form className="admin-proyecto-prospectos-filtros" onSubmit={aplicarFiltros}>
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
            {ESTATUS_PROSPECTO.map((estatus) => <option key={estatus} value={estatus}>{estatus}</option>)}
          </select>
        </label>
        <label>
          <span>Activos</span>
          <select name="soloActivos" value={filtros.soloActivos} onChange={actualizarFiltro}>
            <option value="true">Solo activos</option>
            <option value="false">Todos</option>
          </select>
        </label>
        <button type="submit">Recargar</button>
      </form>

      {cargando ? <p className="admin-proyecto-prospectos-feedback">Cargando prospectos...</p> : null}
      {mensaje ? <p className="admin-proyecto-prospectos-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="admin-proyecto-prospectos-feedback is-error">{error}</p> : null}

      {!cargando ? (
        <section className="admin-proyecto-prospectos-card">
          {prospectos.length === 0 ? (
            <p className="admin-proyecto-prospectos-empty">Aun no hay prospectos registrados.</p>
          ) : (
            <div className="admin-proyecto-prospectos-table-wrap">
              <table className="admin-proyecto-prospectos-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Proyecto</th>
                    <th>Unidad</th>
                    <th>Empresa</th>
                    <th>Prospecto</th>
                    <th>Telefono</th>
                    <th>Correo</th>
                    <th>Origen</th>
                    <th>Estatus</th>
                    <th>Fecha contacto</th>
                    <th>Observaciones</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {prospectos.map((prospecto) => (
                    <tr key={prospecto.id}>
                      <td>{prospecto.fechaCreacion}</td>
                      <td>{prospecto.proyectoNombre}</td>
                      <td>{prospecto.unidadCodigo}</td>
                      <td>{prospecto.empresaNombre}</td>
                      <td><strong>{prospecto.nombre}</strong></td>
                      <td>{prospecto.telefono || '-'}</td>
                      <td>{prospecto.correo || '-'}</td>
                      <td>{prospecto.origen}</td>
                      <td><span className={`admin-proyecto-prospectos-status is-${prospecto.estatus.toLowerCase()}`}>{prospecto.estatus}</span></td>
                      <td>{prospecto.fechaContacto}</td>
                      <td>{prospecto.observaciones || prospecto.mensaje || '-'}</td>
                      <td>
                        <div className="admin-proyecto-prospectos-actions">
                          <button type="button" onClick={() => abrirCambioEstatus(prospecto)}>Cambiar estatus</button>
                          {prospecto.mensaje || prospecto.observaciones ? (
                            <button type="button" onClick={() => window.alert(prospecto.mensaje || prospecto.observaciones)}>Ver mensaje</button>
                          ) : null}
                          {prospecto.telefono ? <button type="button" onClick={() => copiar(prospecto.telefono, 'Telefono')}>Copiar tel.</button> : null}
                          {prospecto.correo ? <button type="button" onClick={() => copiar(prospecto.correo, 'Correo')}>Copiar correo</button> : null}
                          {prospecto.telefono ? <a href={buildWhatsappUrl(prospecto.telefono)} target="_blank" rel="noopener noreferrer">WhatsApp</a> : null}
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
        <div className="admin-proyecto-prospectos-modal-overlay" role="presentation" onMouseDown={cerrarModal}>
          <section className="admin-proyecto-prospectos-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-proyecto-prospectos-modal-head">
              <div>
                <p className="admin-proyecto-prospectos-eyebrow">Prospecto</p>
                <h2>Cambiar estatus</h2>
              </div>
              <button type="button" onClick={cerrarModal} disabled={guardando} aria-label="Cerrar">x</button>
            </div>
            <form onSubmit={guardarEstatus}>
              <div className="admin-proyecto-prospectos-form-grid">
                <label>
                  <span>Estatus</span>
                  <select value={formEstatus.estatus} onChange={(event) => setFormEstatus((actual) => ({ ...actual, estatus: event.target.value }))}>
                    {ESTATUS_PROSPECTO.map((estatus) => <option key={estatus} value={estatus}>{estatus}</option>)}
                  </select>
                </label>
                <label className="is-full">
                  <span>Observaciones</span>
                  <textarea value={formEstatus.observaciones} onChange={(event) => setFormEstatus((actual) => ({ ...actual, observaciones: event.target.value }))} rows="4" />
                </label>
              </div>
              <div className="admin-proyecto-prospectos-modal-actions">
                <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
                <button type="button" onClick={cerrarModal} disabled={guardando}>Cancelar</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
