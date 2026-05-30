import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { resolveApiAssetUrl } from '../../services/apiClient';
import {
  actualizarImagen,
  listarImagenes,
  setImagenActivo,
  subirImagen,
} from '../../services/proyectoImagenesService';
import { obtenerProyecto } from '../../services/proyectosInmobiliariosService';
import usePermisosEmpresa from '../../hooks/usePermisosEmpresa';
import './AdminProyectoImagenesPage.css';

const TIPOS_IMAGEN = ['PRINCIPAL', 'GALERIA', 'AMENIDAD', 'PLANO_COMERCIAL', 'RENDER', 'LOGO', 'OTRO'];
const EXTENSIONES_PERMITIDAS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const TIPO_LABELS = {
  PRINCIPAL: 'Principal',
  GALERIA: 'Galería',
  AMENIDAD: 'Amenidad',
  PLANO_COMERCIAL: 'Plano comercial',
  RENDER: 'Render',
  LOGO: 'Logo',
  OTRO: 'Otro',
};

const FORM_INICIAL = {
  tipoImagen: 'GALERIA',
  url: '',
  titulo: '',
  descripcion: '',
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

const mapImagenToForm = (imagen = {}) => ({
  tipoImagen: imagen.tipoImagen || 'GALERIA',
  url: imagen.url || '',
  titulo: imagen.titulo || '',
  descripcion: imagen.descripcion || '',
  orden: toInputValue(imagen.orden ?? 0),
});

const buildPayload = (form, proyectoId) => ({
  proyectoId: toNumberOrNull(proyectoId),
  tipoImagen: form.tipoImagen,
  url: form.url.trim(),
  titulo: form.titulo.trim() || null,
  descripcion: form.descripcion.trim() || null,
  orden: toNumberOrNull(form.orden) ?? 0,
});

export default function AdminProyectoImagenesPage() {
  const permisosEmpresa = usePermisosEmpresa();
  const puedeSubirImagenes = permisosEmpresa.puedeSubirImagenes;
  const { proyectoId } = useParams();
  const [proyecto, setProyecto] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [soloActivas, setSoloActivas] = useState('true');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [imagenEditando, setImagenEditando] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [archivoPreview, setArchivoPreview] = useState('');
  const [form, setForm] = useState(FORM_INICIAL);
  const [miniaturasError, setMiniaturasError] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [accionando, setAccionando] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarDatos = useCallback(async (options = {}) => {
    setCargando(true);
    setError('');

    try {
      const [proyectoData, imagenesData] = await Promise.all([
        obtenerProyecto(proyectoId, { signal: options.signal }),
        listarImagenes(proyectoId, {
          soloActivas: soloActivas === 'true',
          signal: options.signal,
        }),
      ]);

      setProyecto(proyectoData);
      setImagenes([...imagenesData].sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0)));
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(getApiErrorMessage(err));
      }
    } finally {
      if (!options.signal?.aborted) {
        setCargando(false);
      }
    }
  }, [proyectoId, soloActivas]);

  useEffect(() => {
    const controller = new AbortController();
    cargarDatos({ signal: controller.signal });
    return () => controller.abort();
  }, [cargarDatos]);

  useEffect(() => () => {
    if (archivoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(archivoPreview);
    }
  }, [archivoPreview]);

  const imagenesFiltradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();

    return imagenes.filter((imagen) => {
      const coincideTipo = !tipoFiltro || imagen.tipoImagen === tipoFiltro;
      const coincideTexto = !term || [
        imagen.titulo,
        imagen.descripcion,
        imagen.url,
      ].join(' ').toLowerCase().includes(term);

      return coincideTipo && coincideTexto;
    });
  }, [busqueda, imagenes, tipoFiltro]);

  const actualizarCampo = (event) => {
    const { name, value } = event.target;
    setForm((actual) => ({ ...actual, [name]: value }));
  };

  const abrirNuevaImagen = () => {
    setImagenEditando(null);
    setArchivo(null);
    limpiarArchivoPreview();
    setForm(FORM_INICIAL);
    setError('');
    setModalOpen(true);
  };

  const abrirEditarImagen = (imagen) => {
    setImagenEditando(imagen);
    setArchivo(null);
    limpiarArchivoPreview();
    setForm(mapImagenToForm(imagen));
    setError('');
    setModalOpen(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModalOpen(false);
    setImagenEditando(null);
    setArchivo(null);
    limpiarArchivoPreview();
    setForm(FORM_INICIAL);
  };

  const validar = () => {
    if (!form.tipoImagen) return 'Selecciona el tipo de imagen.';
    if (!imagenEditando && !archivo) return 'Selecciona un archivo para subir.';
    if (form.orden !== '' && Number.isNaN(Number(form.orden))) return 'Orden debe ser numerico.';
    return '';
  };

  const limpiarArchivoPreview = () => {
    setArchivoPreview((actual) => {
      if (actual?.startsWith('blob:')) {
        URL.revokeObjectURL(actual);
      }
      return '';
    });
  };

  const seleccionarArchivo = (file) => {
    setError('');
    setMensaje('');
    setArchivo(null);
    limpiarArchivoPreview();

    if (!file) return;

    const extension = String(file.name || '').split('.').pop().toLowerCase();
    if (!EXTENSIONES_PERMITIDAS.includes(extension)) {
      setError('Selecciona una imagen JPG, JPEG, PNG o WEBP.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('La imagen no debe pesar mas de 10MB.');
      return;
    }

    setArchivo(file);
    setArchivoPreview(URL.createObjectURL(file));
  };

  const guardarImagen = async (event) => {
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

      if (imagenEditando) {
        await actualizarImagen(imagenEditando.id, payload);
        setMensaje('Imagen actualizada correctamente.');
      } else {
        await subirImagen(proyectoId, {
          file: archivo,
          tipoImagen: form.tipoImagen,
          titulo: form.titulo.trim() || null,
          descripcion: form.descripcion.trim() || null,
          orden: form.orden,
        });
        setMensaje('Imagen subida correctamente.');
      }

      setModalOpen(false);
      setImagenEditando(null);
      setArchivo(null);
      limpiarArchivoPreview();
      setForm(FORM_INICIAL);
      await cargarDatos();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  const alternarActivo = async (imagen) => {
    const siguiente = !imagen.activo;

    if (!siguiente && !window.confirm(`Desactivar la imagen "${imagen.titulo || imagen.url}"?`)) {
      return;
    }

    setAccionando(imagen.id);
    setError('');
    setMensaje('');

    try {
      await setImagenActivo(imagen.id, siguiente);
      setMensaje(`Imagen ${siguiente ? 'activada' : 'desactivada'} correctamente.`);
      await cargarDatos();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionando('');
    }
  };

  const copiarUrl = async (url) => {
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setMensaje('URL copiada al portapapeles.');
    } catch (_) {
      setMensaje(`URL: ${url}`);
    }
  };

  const marcarMiniaturaError = (id) => {
    setMiniaturasError((actual) => ({ ...actual, [id]: true }));
  };

  if (cargando) {
    return (
      <main className="admin-proyecto-imagenes">
        <p className="admin-proyecto-imagenes-feedback">Cargando imagenes...</p>
      </main>
    );
  }

  return (
    <main className="admin-proyecto-imagenes">
      <section className="admin-proyecto-imagenes-hero">
        <div>
          <p className="admin-proyecto-imagenes-eyebrow">Imágenes comerciales</p>
          <h1>{proyecto?.nombre || 'Proyecto inmobiliario'}</h1>
          <span>{proyecto?.tipoProyecto} - {proyecto?.empresaNombre}</span>
        </div>
        <div className="admin-proyecto-imagenes-hero-actions">
          <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/editar`}>Editar proyecto</Link>
          <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/unidades`}>Unidades</Link>
          <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/modelos`}>Modelos</Link>
          <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/plano`}>Plano interactivo</Link>
          <Link to={`/admin/proyectos-inmobiliarios/prospectos?proyectoId=${proyectoId}`}>Prospectos</Link>
          <Link to={`/admin/proyectos-inmobiliarios/apartados?proyectoId=${proyectoId}`}>Apartados</Link>
          <Link to="/admin/proyectos-inmobiliarios">Volver al listado</Link>
          {puedeSubirImagenes ? <button type="button" onClick={abrirNuevaImagen}>Nueva imagen</button> : null}
        </div>
      </section>

      <p className="admin-proyecto-imagenes-security">
        Esta seccion es solo para imagenes publicas/comerciales del proyecto. No subir aqui comprobantes de pago, contratos, identificaciones ni documentos sensibles. Los archivos subidos aqui podran mostrarse publicamente en la landing del proyecto.
      </p>

      <section className="admin-proyecto-imagenes-filtros">
        <label>
          <span>Buscar</span>
          <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Titulo, descripcion o URL" />
        </label>
        <label>
          <span>Tipo imagen</span>
          <select value={tipoFiltro} onChange={(event) => setTipoFiltro(event.target.value)}>
            <option value="">Todos</option>
            {TIPOS_IMAGEN.map((tipo) => <option key={tipo} value={tipo}>{TIPO_LABELS[tipo] || tipo}</option>)}
          </select>
        </label>
        <label>
          <span>Activas</span>
          <select value={soloActivas} onChange={(event) => setSoloActivas(event.target.value)}>
            <option value="true">Solo activas</option>
            <option value="false">Todas</option>
          </select>
        </label>
        <button type="button" onClick={() => cargarDatos()}>Recargar</button>
      </section>

      {mensaje ? <p className="admin-proyecto-imagenes-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="admin-proyecto-imagenes-feedback is-error">{error}</p> : null}

      <section className="admin-proyecto-imagenes-card">
        {imagenesFiltradas.length === 0 ? (
          <p className="admin-proyecto-imagenes-empty">Este proyecto aun no tiene imagenes registradas.</p>
        ) : (
          <div className="admin-proyecto-imagenes-table-wrap">
            <table className="admin-proyecto-imagenes-table">
              <thead>
                <tr>
                  <th>Vista previa</th>
                  <th>Orden</th>
                  <th>Tipo imagen</th>
                  <th>Titulo</th>
                  <th>Descripción</th>
                  <th>URL</th>
                  <th>Activo</th>
                  <th>Fecha creacion</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {imagenesFiltradas.map((imagen) => {
                  const imageUrl = resolveApiAssetUrl(imagen.url);

                  return (
                    <tr key={imagen.id}>
                      <td data-label="Vista previa">
                        <div className="admin-proyecto-imagenes-thumb">
                          {imagen.url && !miniaturasError[imagen.id] ? (
                            <img src={imageUrl} alt={imagen.titulo || 'Imagen del proyecto'} onError={() => marcarMiniaturaError(imagen.id)} />
                          ) : (
                            <span>No disponible</span>
                          )}
                        </div>
                      </td>
                      <td data-label="Orden">{imagen.orden ?? 0}</td>
                      <td data-label="Tipo imagen">
                        <span className={`admin-proyecto-imagenes-type is-${imagen.tipoImagen.toLowerCase()}`}>
                          {TIPO_LABELS[imagen.tipoImagen] || imagen.tipoImagen}
                        </span>
                      </td>
                      <td data-label="Titulo"><strong>{imagen.titulo || '-'}</strong></td>
                      <td data-label="Descripción">{imagen.descripcion || '-'}</td>
                      <td data-label="URL">
                        <span className="admin-proyecto-imagenes-url">{imagen.url}</span>
                      </td>
                      <td data-label="Activo">
                        <span className={`admin-proyecto-imagenes-pill ${imagen.activo ? 'is-ok' : 'is-off'}`}>
                          {imagen.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td data-label="Fecha creacion">{imagen.fechaCreacion}</td>
                      <td data-label="Acciones">
                        <div className="admin-proyecto-imagenes-actions">
                          {imagen.url ? <a href={imageUrl} target="_blank" rel="noopener noreferrer">Ver imagen</a> : null}
                          {imagen.url ? <button type="button" onClick={() => copiarUrl(imagen.url)}>Copiar URL</button> : null}
                          {puedeSubirImagenes ? (
                            <>
                              <button type="button" onClick={() => abrirEditarImagen(imagen)}>Editar</button>
                              <button type="button" onClick={() => alternarActivo(imagen)} disabled={accionando === imagen.id}>
                                {imagen.activo ? 'Desactivar' : 'Activar'}
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

      {modalOpen ? (
        <div className="admin-proyecto-imagenes-modal-overlay" role="presentation" onMouseDown={cerrarModal}>
          <section className="admin-proyecto-imagenes-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-proyecto-imagenes-modal-head">
              <div>
                <p className="admin-proyecto-imagenes-eyebrow">Imagen publica</p>
                <h2>{imagenEditando ? 'Editar imagen' : 'Nueva imagen'}</h2>
              </div>
              <button type="button" onClick={cerrarModal} disabled={guardando} aria-label="Cerrar">x</button>
            </div>
            <form onSubmit={guardarImagen}>
              <div className="admin-proyecto-imagenes-form-grid">
                <label>
                  <span>Tipo imagen</span>
                  <select name="tipoImagen" value={form.tipoImagen} onChange={actualizarCampo} required>
                    {TIPOS_IMAGEN.map((tipo) => <option key={tipo} value={tipo}>{TIPO_LABELS[tipo] || tipo}</option>)}
                  </select>
                </label>
                <label>
                  <span>Orden</span>
                  <input name="orden" type="number" step="1" value={form.orden} onChange={actualizarCampo} />
                </label>
                {imagenEditando ? (
                  <label className="is-full">
                    <span>URL actual</span>
                    <input name="url" value={form.url} readOnly />
                  </label>
                ) : (
                  <div className="admin-proyecto-imagenes-upload is-full">
                    <label>
                      <span>Archivo</span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        onChange={(event) => {
                          seleccionarArchivo(event.target.files?.[0]);
                          event.target.value = '';
                        }}
                      />
                      <small>JPG, JPEG, PNG o WEBP. Tamaño máximo 10MB.</small>
                    </label>
                    <div className="admin-proyecto-imagenes-upload-preview">
                      {archivoPreview ? <img src={archivoPreview} alt="Preview de imagen" /> : <span>Preview</span>}
                    </div>
                  </div>
                )}
                <label className="is-full">
                  <span>Titulo</span>
                  <input name="titulo" value={form.titulo} onChange={actualizarCampo} />
                </label>
                <label className="is-full">
                  <span>Descripción</span>
                  <textarea name="descripcion" value={form.descripcion} onChange={actualizarCampo} rows="4" />
                </label>
              </div>
              <p className="admin-proyecto-imagenes-modal-note">
                Solo registra imagenes publicas o comerciales. No uses esta seccion para documentos privados.
              </p>
              <div className="admin-proyecto-imagenes-modal-actions">
                <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar imagen'}</button>
                <button type="button" onClick={cerrarModal} disabled={guardando}>Cancelar</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
