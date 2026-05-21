import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listarProyectos,
  setProyectoActivo,
  setProyectoPublicacion,
} from '../../services/proyectosInmobiliariosService';
import usePermisosEmpresa from '../../hooks/usePermisosEmpresa';
import './AdminProyectosInmobiliariosPage.css';

const FILTROS_INICIALES = {
  texto: '',
  tipoProyecto: '',
  estatusPublicacion: '',
  soloActivos: 'true',
};

const TIPOS_PROYECTO = [
  'LOTEO',
  'DESARROLLO_CASAS',
  'DESARROLLO_VERTICAL',
  'MIXTO',
];

const ESTATUS_PUBLICACION = [
  'BORRADOR',
  'EN_REVISION',
  'PUBLICADO',
  'PAUSADO',
  'ARCHIVADO',
];

const TIPO_LABELS = {
  LOTEO: 'Loteo',
  DESARROLLO_CASAS: 'Casas',
  DESARROLLO_VERTICAL: 'Vertical',
  MIXTO: 'Mixto',
};

const ESTATUS_LABELS = {
  BORRADOR: 'Borrador',
  EN_REVISION: 'En revision',
  PUBLICADO: 'Publicado',
  PAUSADO: 'Pausado',
  ARCHIVADO: 'Archivado',
};

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible procesar la accion.';

export default function AdminProyectosInmobiliariosPage() {
  const permisosEmpresa = usePermisosEmpresa();
  const puedeCrearProyecto = permisosEmpresa.puedeCrearProyecto;
  const puedeEditarProyecto = permisosEmpresa.puedeEditarProyecto;
  const puedeAccederProyectos = permisosEmpresa.puedeAccederProyectos;
  const [proyectos, setProyectos] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [cargando, setCargando] = useState(true);
  const [accionandoId, setAccionandoId] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const filtrosConsulta = useMemo(() => ({
    texto: filtros.texto.trim(),
    tipoProyecto: filtros.tipoProyecto,
    estatusPublicacion: filtros.estatusPublicacion,
    soloActivos: filtros.soloActivos === 'true',
  }), [filtros]);

  const cargarProyectos = useCallback(async (options = {}) => {
    setCargando(true);
    setError('');

    try {
      const data = await listarProyectos({
        ...filtrosConsulta,
        signal: options.signal,
      });
      setProyectos(data);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(getApiErrorMessage(err));
      }
    } finally {
      if (!options.signal?.aborted) {
        setCargando(false);
      }
    }
  }, [filtrosConsulta]);

  useEffect(() => {
    const controller = new AbortController();
    cargarProyectos({ signal: controller.signal });
    return () => controller.abort();
  }, [cargarProyectos]);

  const actualizarFiltro = (event) => {
    const { name, value } = event.target;
    setFiltros((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

  const limpiarFiltros = () => setFiltros(FILTROS_INICIALES);

  if (!puedeAccederProyectos) {
    return (
      <main className="admin-proyectos">
        <section className="admin-proyectos-hero">
          <div>
            <p className="admin-proyectos-eyebrow">Proyectos inmobiliarios</p>
            <h1>Administracion de proyectos</h1>
          </div>
          <Link className="admin-proyectos-primary" to="/admin/propiedades">
            Ir a Mis propiedades
          </Link>
        </section>
        <p className="admin-proyectos-feedback is-error">No tienes permiso para acceder a esta seccion.</p>
      </main>
    );
  }

  const alternarActivo = async (proyecto) => {
    const siguienteActivo = !proyecto.activo;
    const accion = siguienteActivo ? 'activar' : 'desactivar';

    if (!window.confirm(`Deseas ${accion} el proyecto "${proyecto.nombre}"?`)) {
      return;
    }

    setAccionandoId(proyecto.id);
    setError('');
    setMensaje('');

    try {
      await setProyectoActivo(proyecto.id, siguienteActivo);
      setMensaje(`Proyecto ${siguienteActivo ? 'activado' : 'desactivado'} correctamente.`);
      await cargarProyectos();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionandoId('');
    }
  };

  const alternarPublicacion = async (proyecto) => {
    const estaPublicado = proyecto.estatusPublicacion === 'PUBLICADO';
    const siguiente = estaPublicado
      ? { estatusPublicacion: 'PAUSADO', mostrarEnPublico: false }
      : { estatusPublicacion: 'PUBLICADO', mostrarEnPublico: true };
    const accion = estaPublicado ? 'pausar' : 'publicar';

    if (!window.confirm(`Deseas ${accion} el proyecto "${proyecto.nombre}"?`)) {
      return;
    }

    setAccionandoId(proyecto.id);
    setError('');
    setMensaje('');

    try {
      await setProyectoPublicacion(proyecto.id, siguiente);
      setMensaje(estaPublicado ? 'Proyecto pausado correctamente.' : 'Proyecto publicado correctamente.');
      await cargarProyectos();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionandoId('');
    }
  };

  return (
    <main className="admin-proyectos">
      <section className="admin-proyectos-hero">
        <div>
          <p className="admin-proyectos-eyebrow">Proyectos inmobiliarios</p>
          <h1>Administracion de proyectos</h1>
        </div>
        {puedeCrearProyecto ? (
          <Link className="admin-proyectos-primary" to="/admin/proyectos-inmobiliarios/nuevo">
            Nuevo proyecto
          </Link>
        ) : null}
      </section>

      <section className="admin-proyectos-filtros">
        <label>
          <span>Buscar</span>
          <input
            name="texto"
            value={filtros.texto}
            onChange={actualizarFiltro}
            placeholder="Nombre, empresa o ubicacion"
          />
        </label>
        <label>
          <span>Tipo proyecto</span>
          <select name="tipoProyecto" value={filtros.tipoProyecto} onChange={actualizarFiltro}>
            <option value="">Todos</option>
            {TIPOS_PROYECTO.map((tipo) => (
              <option key={tipo} value={tipo}>{TIPO_LABELS[tipo] || tipo}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Publicacion</span>
          <select name="estatusPublicacion" value={filtros.estatusPublicacion} onChange={actualizarFiltro}>
            <option value="">Todos</option>
            {ESTATUS_PUBLICACION.map((estatus) => (
              <option key={estatus} value={estatus}>{ESTATUS_LABELS[estatus] || estatus}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Activos</span>
          <select name="soloActivos" value={filtros.soloActivos} onChange={actualizarFiltro}>
            <option value="true">Solo activos</option>
            <option value="false">Todos</option>
          </select>
        </label>
        <button type="button" onClick={limpiarFiltros}>Limpiar</button>
      </section>

      {cargando ? <p className="admin-proyectos-feedback">Cargando proyectos...</p> : null}
      {mensaje ? <p className="admin-proyectos-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="admin-proyectos-feedback is-error">{error}</p> : null}

      {!cargando && !error ? (
        <section className="admin-proyectos-card">
          {proyectos.length === 0 ? (
            <p className="admin-proyectos-empty">No hay proyectos inmobiliarios con los filtros seleccionados.</p>
          ) : (
            <div className="admin-proyectos-table-wrap">
              <table className="admin-proyectos-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Empresa</th>
                    <th>Tipo</th>
                    <th>Ubicacion</th>
                    <th>Precio desde</th>
                    <th>Unidades</th>
                    <th>Publicacion</th>
                    <th>Publico</th>
                    <th>Activo</th>
                    <th>Creacion</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {proyectos.map((proyecto) => {
                    const disabled = accionandoId === proyecto.id;

                    return (
                      <tr key={proyecto.id}>
                        <td data-label="Nombre"><strong>{proyecto.nombre}</strong></td>
                        <td data-label="Empresa">{proyecto.empresaNombre}</td>
                        <td data-label="Tipo">
                          <span className={`admin-proyectos-pill is-tipo-${proyecto.tipoProyecto.toLowerCase()}`}>
                            {TIPO_LABELS[proyecto.tipoProyecto] || proyecto.tipoProyecto}
                          </span>
                        </td>
                        <td data-label="Ubicacion">{proyecto.ubicacion}</td>
                        <td data-label="Precio desde">{proyecto.precioDesdeTexto}</td>
                        <td data-label="Unidades">{proyecto.totalUnidades}</td>
                        <td data-label="Publicacion">
                          <span className={`admin-proyectos-pill is-${proyecto.estatusPublicacion.toLowerCase()}`}>
                            {ESTATUS_LABELS[proyecto.estatusPublicacion] || proyecto.estatusPublicacion}
                          </span>
                        </td>
                        <td data-label="Publico">
                          <span className={`admin-proyectos-pill ${proyecto.mostrarEnPublico ? 'is-ok' : 'is-off'}`}>
                            {proyecto.mostrarEnPublico ? 'Publico' : 'Oculto'}
                          </span>
                        </td>
                        <td data-label="Activo">
                          <span className={`admin-proyectos-pill ${proyecto.activo ? 'is-ok' : 'is-off'}`}>
                            {proyecto.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td data-label="Creacion">{proyecto.fechaCreacion}</td>
                        <td data-label="Acciones">
                          <div className="admin-proyectos-actions">
                            {puedeEditarProyecto ? <Link to={`/admin/proyectos-inmobiliarios/${proyecto.id}/editar`}>Editar</Link> : null}
                            <Link to={`/admin/proyectos-inmobiliarios/${proyecto.id}/unidades`}>Unidades</Link>
                            <Link to={`/admin/proyectos-inmobiliarios/${proyecto.id}/modelos`}>Modelos</Link>
                            <Link to={`/admin/proyectos-inmobiliarios/${proyecto.id}/plano`}>Plano</Link>
                            <Link to={`/admin/proyectos-inmobiliarios/${proyecto.id}/imagenes`}>Imagenes</Link>
                            <Link to={`/admin/proyectos-inmobiliarios/prospectos?proyectoId=${proyecto.id}`}>Prospectos</Link>
                            <Link to={`/admin/proyectos-inmobiliarios/apartados?proyectoId=${proyecto.id}`}>Apartados</Link>
                            {proyecto.slug ? (
                              <a href={`#/proyectos-inmobiliarios/${proyecto.slug}`} target="_blank" rel="noopener noreferrer">Ver landing publica</a>
                            ) : null}
                            {puedeEditarProyecto ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => alternarActivo(proyecto)}
                                  disabled={disabled}
                                >
                                  {disabled ? 'Procesando...' : proyecto.activo ? 'Desactivar' : 'Activar'}
                                </button>
                                <button
                                  type="button"
                                  className={proyecto.estatusPublicacion === 'PUBLICADO' ? 'is-warning' : ''}
                                  onClick={() => alternarPublicacion(proyecto)}
                                  disabled={disabled}
                                >
                                  {proyecto.estatusPublicacion === 'PUBLICADO' ? 'Pausar' : 'Publicar'}
                                </button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
