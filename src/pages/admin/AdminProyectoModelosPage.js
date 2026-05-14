import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  actualizarModelo,
  crearModelo,
  listarModelos,
  setModeloActivo,
} from '../../services/proyectoModelosService';
import { obtenerProyecto } from '../../services/proyectosInmobiliariosService';
import './AdminProyectoModelosPage.css';

const FORM_INICIAL = {
  nombre: '',
  slug: '',
  descripcion: '',
  recamaras: '',
  banos: '',
  mediosBanos: '',
  estacionamientos: '',
  niveles: '',
  superficieTerrenoM2: '',
  superficieConstruccionM2: '',
  precioDesde: '',
  imagenPrincipalUrl: '',
  tour360Url: '',
  orden: '0',
};

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible procesar la accion.';

const toInputValue = (value) =>
  value === null || value === undefined ? '' : String(value);

const toNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
};

const generarSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const mapModeloToForm = (modelo = {}) => ({
  nombre: modelo.nombre || '',
  slug: modelo.slug || '',
  descripcion: modelo.descripcion || '',
  recamaras: toInputValue(modelo.recamaras),
  banos: toInputValue(modelo.banos),
  mediosBanos: toInputValue(modelo.mediosBanos),
  estacionamientos: toInputValue(modelo.estacionamientos),
  niveles: toInputValue(modelo.niveles),
  superficieTerrenoM2: toInputValue(modelo.superficieTerrenoM2),
  superficieConstruccionM2: toInputValue(modelo.superficieConstruccionM2),
  precioDesde: toInputValue(modelo.precioDesde),
  imagenPrincipalUrl: modelo.imagenPrincipalUrl || '',
  tour360Url: modelo.tour360Url || '',
  orden: toInputValue(modelo.orden || 0),
});

const buildPayload = (form, proyectoId) => ({
  proyectoId: toNumberOrNull(proyectoId),
  nombre: form.nombre.trim(),
  slug: form.slug.trim() || null,
  descripcion: form.descripcion.trim() || null,
  recamaras: toNumberOrNull(form.recamaras),
  banos: toNumberOrNull(form.banos),
  mediosBanos: toNumberOrNull(form.mediosBanos),
  estacionamientos: toNumberOrNull(form.estacionamientos),
  niveles: toNumberOrNull(form.niveles),
  superficieTerrenoM2: toNumberOrNull(form.superficieTerrenoM2),
  superficieConstruccionM2: toNumberOrNull(form.superficieConstruccionM2),
  precioDesde: toNumberOrNull(form.precioDesde),
  imagenPrincipalUrl: form.imagenPrincipalUrl.trim() || null,
  tour360Url: form.tour360Url.trim() || null,
  orden: toNumberOrNull(form.orden) ?? 0,
});

export default function AdminProyectoModelosPage() {
  const { proyectoId } = useParams();
  const [proyecto, setProyecto] = useState(null);
  const [modelos, setModelos] = useState([]);
  const [soloActivos, setSoloActivos] = useState('true');
  const [busqueda, setBusqueda] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modeloEditando, setModeloEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [accionando, setAccionando] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarDatos = useCallback(async (options = {}) => {
    setCargando(true);
    setError('');

    try {
      const [proyectoData, modelosData] = await Promise.all([
        obtenerProyecto(proyectoId, { signal: options.signal }),
        listarModelos(proyectoId, {
          soloActivos: soloActivos === 'true',
          signal: options.signal,
        }),
      ]);

      setProyecto(proyectoData);
      setModelos([...modelosData].sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0)));
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(getApiErrorMessage(err));
      }
    } finally {
      if (!options.signal?.aborted) {
        setCargando(false);
      }
    }
  }, [proyectoId, soloActivos]);

  useEffect(() => {
    const controller = new AbortController();
    cargarDatos({ signal: controller.signal });
    return () => controller.abort();
  }, [cargarDatos]);

  const modelosFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return modelos;

    return modelos.filter((modelo) =>
      [modelo.nombre, modelo.slug, modelo.descripcion].join(' ').toLowerCase().includes(term)
    );
  }, [busqueda, modelos]);

  const actualizarCampo = (event) => {
    const { name, value } = event.target;
    setForm((actual) => ({ ...actual, [name]: value }));
  };

  const abrirNuevoModelo = () => {
    setModeloEditando(null);
    setForm(FORM_INICIAL);
    setError('');
    setModalOpen(true);
  };

  const abrirEditarModelo = (modelo) => {
    setModeloEditando(modelo);
    setForm(mapModeloToForm(modelo));
    setError('');
    setModalOpen(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModalOpen(false);
    setModeloEditando(null);
    setForm(FORM_INICIAL);
  };

  const generarSlugDesdeNombre = () => {
    setForm((actual) => ({ ...actual, slug: generarSlug(actual.nombre) }));
  };

  const validar = () => {
    if (!form.nombre.trim()) return 'El nombre es requerido.';

    const numericos = [
      ['recamaras', 'Recamaras'],
      ['banos', 'Banos'],
      ['mediosBanos', 'Medios banos'],
      ['estacionamientos', 'Estacionamientos'],
      ['niveles', 'Niveles'],
      ['superficieTerrenoM2', 'Superficie terreno'],
      ['superficieConstruccionM2', 'Superficie construccion'],
      ['precioDesde', 'Precio desde'],
      ['orden', 'Orden'],
    ];

    for (const [key, label] of numericos) {
      if (form[key] !== '' && Number(form[key]) < 0) {
        return `${label} no puede ser negativo.`;
      }
    }

    return '';
  };

  const guardarModelo = async (event) => {
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
      const payload = buildPayload(form, proyectoId);

      if (modeloEditando) {
        await actualizarModelo(modeloEditando.id, payload);
        setMensaje('Modelo actualizado correctamente.');
      } else {
        await crearModelo(proyectoId, payload);
        setMensaje('Modelo creado correctamente.');
      }

      cerrarModal();
      await cargarDatos();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  const alternarActivo = async (modelo) => {
    const siguiente = !modelo.activo;

    if (!siguiente && !window.confirm(`Desactivar el modelo "${modelo.nombre}"?`)) {
      return;
    }

    setAccionando(modelo.id);
    setError('');
    setMensaje('');

    try {
      await setModeloActivo(modelo.id, siguiente);
      setMensaje(`Modelo ${siguiente ? 'activado' : 'desactivado'} correctamente.`);
      await cargarDatos();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionando('');
    }
  };

  if (cargando) {
    return (
      <main className="admin-proyecto-modelos">
        <p className="admin-proyecto-modelos-feedback">Cargando modelos...</p>
      </main>
    );
  }

  return (
    <main className="admin-proyecto-modelos">
      <section className="admin-proyecto-modelos-hero">
        <div>
          <p className="admin-proyecto-modelos-eyebrow">Modelos / prototipos</p>
          <h1>{proyecto?.nombre || 'Proyecto inmobiliario'}</h1>
          <span>{proyecto?.tipoProyecto} - {proyecto?.empresaNombre}</span>
        </div>
        <div className="admin-proyecto-modelos-hero-actions">
          <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/editar`}>Editar proyecto</Link>
          <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/unidades`}>Unidades</Link>
          <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/plano`}>Plano interactivo</Link>
          <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/imagenes`}>Imagenes</Link>
          <Link to={`/admin/proyectos-inmobiliarios/prospectos?proyectoId=${proyectoId}`}>Prospectos</Link>
          <Link to={`/admin/proyectos-inmobiliarios/apartados?proyectoId=${proyectoId}`}>Apartados</Link>
          <button type="button" onClick={abrirNuevoModelo}>Nuevo modelo</button>
        </div>
      </section>

      {proyecto?.tipoProyecto === 'LOTEO' ? (
        <p className="admin-proyecto-modelos-feedback">
          Este proyecto es de tipo loteo. Los modelos son opcionales y normalmente se usan para desarrollos de casas o departamentos.
        </p>
      ) : null}

      <section className="admin-proyecto-modelos-filtros">
        <label>
          <span>Buscar</span>
          <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Nombre, slug o descripcion" />
        </label>
        <label>
          <span>Activos</span>
          <select value={soloActivos} onChange={(event) => setSoloActivos(event.target.value)}>
            <option value="true">Solo activos</option>
            <option value="false">Todos</option>
          </select>
        </label>
        <button type="button" onClick={() => cargarDatos()}>Recargar</button>
      </section>

      {mensaje ? <p className="admin-proyecto-modelos-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="admin-proyecto-modelos-feedback is-error">{error}</p> : null}

      <section className="admin-proyecto-modelos-card">
        {modelosFiltrados.length === 0 ? (
          <p className="admin-proyecto-modelos-empty">Este proyecto aun no tiene modelos registrados.</p>
        ) : (
          <div className="admin-proyecto-modelos-table-wrap">
            <table className="admin-proyecto-modelos-table">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Nombre</th>
                  <th>Slug</th>
                  <th>Recamaras</th>
                  <th>Banos</th>
                  <th>Medios banos</th>
                  <th>Estac.</th>
                  <th>Niveles</th>
                  <th>Sup. terreno</th>
                  <th>Sup. construccion</th>
                  <th>Precio desde</th>
                  <th>Imagen</th>
                  <th>Tour 360</th>
                  <th>Activo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {modelosFiltrados.map((modelo) => (
                  <tr key={modelo.id}>
                    <td data-label="Orden">{modelo.orden ?? 0}</td>
                    <td data-label="Nombre"><strong>{modelo.nombre}</strong></td>
                    <td data-label="Slug">{modelo.slug || '-'}</td>
                    <td data-label="Recamaras">{modelo.recamaras ?? '-'}</td>
                    <td data-label="Banos">{modelo.banos ?? '-'}</td>
                    <td data-label="Medios banos">{modelo.mediosBanos ?? '-'}</td>
                    <td data-label="Estac.">{modelo.estacionamientos ?? '-'}</td>
                    <td data-label="Niveles">{modelo.niveles ?? '-'}</td>
                    <td data-label="Sup. terreno">{modelo.superficieTerrenoM2 ?? '-'}</td>
                    <td data-label="Sup. construccion">{modelo.superficieConstruccionM2 ?? '-'}</td>
                    <td data-label="Precio desde">{modelo.precioDesdeTexto}</td>
                    <td data-label="Imagen">
                      {modelo.imagenPrincipalUrl ? <a href={modelo.imagenPrincipalUrl} target="_blank" rel="noopener noreferrer">Ver imagen</a> : '-'}
                    </td>
                    <td data-label="Tour 360">
                      {modelo.tour360Url ? <a href={modelo.tour360Url} target="_blank" rel="noopener noreferrer">Ver tour</a> : '-'}
                    </td>
                    <td data-label="Activo">
                      <span className={`admin-proyecto-modelos-pill ${modelo.activo ? 'is-ok' : 'is-off'}`}>
                        {modelo.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div className="admin-proyecto-modelos-actions">
                        <button type="button" onClick={() => abrirEditarModelo(modelo)}>Editar</button>
                        <button type="button" onClick={() => alternarActivo(modelo)} disabled={accionando === modelo.id}>
                          {modelo.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen ? (
        <div className="admin-proyecto-modelos-modal-overlay" role="presentation" onMouseDown={cerrarModal}>
          <section className="admin-proyecto-modelos-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-proyecto-modelos-modal-head">
              <div>
                <p className="admin-proyecto-modelos-eyebrow">Modelo</p>
                <h2>{modeloEditando ? 'Editar modelo' : 'Nuevo modelo'}</h2>
              </div>
              <button type="button" onClick={cerrarModal} disabled={guardando} aria-label="Cerrar">x</button>
            </div>
            <form onSubmit={guardarModelo}>
              <div className="admin-proyecto-modelos-form-grid">
                <label><span>Nombre</span><input name="nombre" value={form.nombre} onChange={actualizarCampo} required /></label>
                <label><span>Slug</span><div className="admin-proyecto-modelos-inline"><input name="slug" value={form.slug} onChange={actualizarCampo} /><button type="button" onClick={generarSlugDesdeNombre}>Generar</button></div></label>
                <label className="is-full"><span>Descripcion</span><textarea name="descripcion" value={form.descripcion} onChange={actualizarCampo} rows="4" /></label>
                <label><span>Recamaras</span><input name="recamaras" type="number" min="0" step="1" value={form.recamaras} onChange={actualizarCampo} /></label>
                <label><span>Banos</span><input name="banos" type="number" min="0" step="0.5" value={form.banos} onChange={actualizarCampo} /></label>
                <label><span>Medios banos</span><input name="mediosBanos" type="number" min="0" step="1" value={form.mediosBanos} onChange={actualizarCampo} /></label>
                <label><span>Estacionamientos</span><input name="estacionamientos" type="number" min="0" step="1" value={form.estacionamientos} onChange={actualizarCampo} /></label>
                <label><span>Niveles</span><input name="niveles" type="number" min="0" step="1" value={form.niveles} onChange={actualizarCampo} /></label>
                <label><span>Superficie terreno m2</span><input name="superficieTerrenoM2" type="number" min="0" step="0.01" value={form.superficieTerrenoM2} onChange={actualizarCampo} /></label>
                <label><span>Superficie construccion m2</span><input name="superficieConstruccionM2" type="number" min="0" step="0.01" value={form.superficieConstruccionM2} onChange={actualizarCampo} /></label>
                <label><span>Precio desde</span><input name="precioDesde" type="number" min="0" step="0.01" value={form.precioDesde} onChange={actualizarCampo} /></label>
                <label><span>Orden</span><input name="orden" type="number" min="0" step="1" value={form.orden} onChange={actualizarCampo} /></label>
                <label className="is-full"><span>Imagen principal URL</span><input name="imagenPrincipalUrl" value={form.imagenPrincipalUrl} onChange={actualizarCampo} /></label>
                <label className="is-full"><span>Tour 360 URL</span><input name="tour360Url" value={form.tour360Url} onChange={actualizarCampo} /></label>
              </div>
              <div className="admin-proyecto-modelos-modal-actions">
                <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar modelo'}</button>
                <button type="button" onClick={cerrarModal} disabled={guardando}>Cancelar</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
