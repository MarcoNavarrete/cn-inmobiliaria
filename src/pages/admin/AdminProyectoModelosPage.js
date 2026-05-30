import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { resolveApiAssetUrl } from '../../services/apiClient';
import {
  actualizarModelo,
  crearModelo,
  listarModelos,
  setModeloActivo,
  subirImagenPrincipalModelo,
} from '../../services/proyectoModelosService';
import { obtenerProyecto } from '../../services/proyectosInmobiliariosService';
import usePermisosEmpresa from '../../hooks/usePermisosEmpresa';
import {
  guardarPreciosModeloProyecto,
  listarPreciosModeloProyecto,
  listarTiposPrecioInmobiliario,
} from '../../services/proyectoPreciosService';
import {
  formatearMonedaMXN,
  obtenerResumenPrecios,
} from '../../utils/preciosInmobiliarios';
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
  tour360Url: '',
  orden: '0',
};

const EXTENSIONES_PERMITIDAS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible procesar la accion.';

const toInputValue = (value) =>
  value === null || value === undefined ? '' : String(value);

const toNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
};

const getFileExtension = (file) => String(file?.name || '').split('.').pop().toLowerCase();

const validarArchivoImagen = (file) => {
  if (!file) return '';

  const extension = getFileExtension(file);
  if (!EXTENSIONES_PERMITIDAS.includes(extension)) {
    return 'Selecciona una imagen JPG, JPEG, PNG o WEBP.';
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'La imagen no debe pesar mas de 10MB.';
  }

  return '';
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
  tour360Url: form.tour360Url.trim() || null,
  orden: toNumberOrNull(form.orden) ?? 0,
});

const getPreviewUrl = (modelo, imagenPreview) =>
  imagenPreview || resolveApiAssetUrl(modelo?.imagenPrincipalUrl || '');

const pickModeloId = (value) =>
  value?.modeloId || value?.id || value?.Id || value?.data?.modeloId || value?.data?.id || '';

export default function AdminProyectoModelosPage() {
  const permisosEmpresa = usePermisosEmpresa();
  const puedeEditarModelo = permisosEmpresa.puedeEditarModelos;
  const { proyectoId } = useParams();
  const [proyecto, setProyecto] = useState(null);
  const [modelos, setModelos] = useState([]);
  const [soloActivos, setSoloActivos] = useState('true');
  const [busqueda, setBusqueda] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modeloEditando, setModeloEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [imagenFile, setImagenFile] = useState(null);
  const [imagenPreview, setImagenPreview] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [accionando, setAccionando] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [tiposPrecio, setTiposPrecio] = useState([]);
  const [preciosModelo, setPreciosModelo] = useState([]);
  const [modeloPreciosAbierto, setModeloPreciosAbierto] = useState(null);
  const [cargandoPrecios, setCargandoPrecios] = useState(false);
  const [guardandoPrecios, setGuardandoPrecios] = useState(false);
  const [errorPrecios, setErrorPrecios] = useState('');
  const [mensajePrecios, setMensajePrecios] = useState('');

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

  const cargarTiposPrecio = useCallback(async (options = {}) => {
    try {
      const tipos = await listarTiposPrecioInmobiliario(options);
      setTiposPrecio(tipos);
      return tipos;
    } catch (err) {
      if (err.name !== 'AbortError') {
        setTiposPrecio([]);
      }
      return [];
    }
  }, []);

  const cargarPreciosModelo = useCallback(async (modelo) => {
    if (!modelo?.id) {
      setPreciosModelo([]);
      return;
    }

    setCargandoPrecios(true);
    setErrorPrecios('');
    setMensajePrecios('');

    try {
      const [tipos, precios] = await Promise.all([
        tiposPrecio.length > 0 ? Promise.resolve(tiposPrecio) : cargarTiposPrecio(),
        listarPreciosModeloProyecto(modelo.id).catch(() => []),
      ]);

      const resumenPrecios = obtenerResumenPrecios({
        precios,
        fallbackPrecio: modelo.precioDesde ?? form.precioDesde,
      });
      const mapaExistentes = new Map(
        resumenPrecios.precios.map((precio) => [String(precio.tipoPrecioId || precio.tipoPrecioCodigo || precio.tipoPrecioNombre).toUpperCase(), precio])
      );
      const catalogoBase = tipos.length > 0 ? tipos : resumenPrecios.precios;

      setPreciosModelo(catalogoBase.map((tipo, index) => {
        const tipoKey = String(tipo.id || tipo.tipoPrecioId || tipo.codigo || tipo.nombre || index).toUpperCase();
        const existente = mapaExistentes.get(tipoKey)
          || resumenPrecios.precios.find((precio) => String(precio.tipoPrecioId || precio.tipoPrecioCodigo || precio.tipoPrecioNombre).toUpperCase() === tipoKey);

        return {
          id: existente?.id || `${tipo.id || tipo.tipoPrecioId || tipoKey}-${index}`,
          tipoPrecioId: tipo.id || tipo.tipoPrecioId || '',
          tipoPrecioCodigo: tipo.codigo || tipo.tipoPrecioCodigo || '',
          tipoPrecioNombre: tipo.nombre || tipo.tipoPrecioNombre || tipo.descripcion || `Esquema ${index + 1}`,
          descripcion: existente?.descripcion || tipo.descripcion || '',
          precio: existente?.precio ?? '',
          activo: existente ? existente.activo !== false : false,
          esPrincipal: existente?.esPrincipal === true,
          orden: existente?.orden ?? tipo.orden ?? index,
        };
      }));
    } catch (err) {
      if (err.name !== 'AbortError') {
        setPreciosModelo([]);
        setErrorPrecios(getApiErrorMessage(err));
      }
    } finally {
      setCargandoPrecios(false);
    }
  }, [cargarTiposPrecio, form.precioDesde, tiposPrecio]);
  useEffect(() => {
    const controller = new AbortController();
    cargarDatos({ signal: controller.signal });
    return () => controller.abort();
  }, [cargarDatos]);

  useEffect(() => {
    cargarTiposPrecio();
  }, [cargarTiposPrecio]);

  useEffect(() => () => {
    if (imagenPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagenPreview);
    }
  }, [imagenPreview]);

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

  const limpiarImagenSeleccionada = () => {
    setImagenFile(null);
    setImagenPreview((actual) => {
      if (actual?.startsWith('blob:')) {
        URL.revokeObjectURL(actual);
      }
      return '';
    });
  };

  const seleccionarImagen = (file) => {
    limpiarImagenSeleccionada();
    setError('');
    setMensaje('');

    if (!file) return;

    const errorArchivo = validarArchivoImagen(file);
    if (errorArchivo) {
      setError(errorArchivo);
      return;
    }

    setImagenFile(file);
    setImagenPreview(URL.createObjectURL(file));
  };

  const abrirNuevoModelo = () => {
    setModeloEditando(null);
    setForm(FORM_INICIAL);
    limpiarImagenSeleccionada();
    setError('');
    setModalOpen(true);
  };

  const abrirEditarModelo = (modelo) => {
    setModeloEditando(modelo);
    setForm(mapModeloToForm(modelo));
    limpiarImagenSeleccionada();
    setError('');
    setModalOpen(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModalOpen(false);
    setModeloEditando(null);
    setForm(FORM_INICIAL);
    limpiarImagenSeleccionada();
  };

  const generarSlugDesdeNombre = () => {
    setForm((actual) => ({ ...actual, slug: generarSlug(actual.nombre) }));
  };

  const validar = () => {
    if (!form.nombre.trim()) return 'El nombre es requerido.';

    const numericos = [
      ['recamaras', 'Recámaras'],
      ['banos', 'Baños'],
      ['mediosBanos', 'Medios baños'],
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
      let modeloGuardadoId = modeloEditando?.id || '';

      if (modeloEditando) {
        await actualizarModelo(modeloEditando.id, payload);
      } else {
        const response = await crearModelo(proyectoId, payload);
        modeloGuardadoId = pickModeloId(response);
      }

      if (!modeloGuardadoId) {
        throw new Error('No fue posible identificar el modelo guardado.');
      }

      if (imagenFile) {
        await subirImagenPrincipalModelo(modeloGuardadoId, imagenFile);
      }

      cerrarModal();
      await cargarDatos();
      setMensaje(modeloEditando ? 'Modelo actualizado correctamente.' : 'Modelo creado correctamente.');
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

  const abrirPreciosModelo = async (modelo) => {
    setModeloPreciosAbierto(modelo);
    await cargarPreciosModelo(modelo);
  };

  const cerrarPreciosModelo = () => {
    if (guardandoPrecios) return;
    setModeloPreciosAbierto(null);
    setPreciosModelo([]);
    setErrorPrecios('');
    setMensajePrecios('');
  };

  const actualizarPrecioModeloFila = (index, cambios) => {
    setPreciosModelo((actuales) =>
      actuales.map((fila, filaIndex) => (filaIndex === index ? { ...fila, ...cambios } : fila))
    );
  };

  const validarPreciosModelo = () => {
    for (const fila of preciosModelo) {
      if (fila.activo && (fila.precio === '' || fila.precio === null || fila.precio === undefined)) {
        return `El precio de ${fila.tipoPrecioNombre} es requerido si el esquema esta activo.`;
      }

      if (fila.precio !== '' && fila.precio !== null && Number(fila.precio) < 0) {
        return `El precio de ${fila.tipoPrecioNombre} no puede ser negativo.`;
      }
    }

    return '';
  };

  const guardarPreciosDelModelo = async () => {
    if (!modeloPreciosAbierto?.id) return;

    const validacion = validarPreciosModelo();
    if (validacion) {
      setErrorPrecios(validacion);
      return;
    }

    setGuardandoPrecios(true);
    setErrorPrecios('');
    setMensajePrecios('');

    try {
      await guardarPreciosModeloProyecto(modeloPreciosAbierto.id, preciosModelo.map((fila, index) => ({
        tipoPrecioId: fila.tipoPrecioId || null,
        tipoPrecioCodigo: fila.tipoPrecioCodigo || null,
        tipoPrecioNombre: fila.tipoPrecioNombre || null,
        descripcion: fila.descripcion || null,
        precio: fila.precio === '' || fila.precio === null || fila.precio === undefined ? null : Number(fila.precio),
        activo: fila.activo === true,
        esPrincipal: fila.esPrincipal === true,
        orden: fila.orden ?? index,
      })));
      setMensajePrecios('Precios del modelo guardados correctamente.');
      await cargarDatos();
      await cargarPreciosModelo(modeloPreciosAbierto);
    } catch (err) {
      setErrorPrecios(getApiErrorMessage(err));
    } finally {
      setGuardandoPrecios(false);
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
          <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/imagenes`}>Imágenes</Link>
          <Link to={`/admin/proyectos-inmobiliarios/prospectos?proyectoId=${proyectoId}`}>Prospectos</Link>
          <Link to={`/admin/proyectos-inmobiliarios/apartados?proyectoId=${proyectoId}`}>Apartados</Link>
          {puedeEditarModelo ? <button type="button" onClick={abrirNuevoModelo}>Nuevo modelo</button> : null}
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
                  <th>Recámaras</th>
                  <th>Baños</th>
                  <th>Medios baños</th>
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
                    <td data-label="Recámaras">{modelo.recamaras ?? '-'}</td>
                    <td data-label="Baños">{modelo.banos ?? '-'}</td>
                    <td data-label="Medios baños">{modelo.mediosBanos ?? '-'}</td>
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
                        {puedeEditarModelo ? (
                          <>
                            <button type="button" onClick={() => abrirEditarModelo(modelo)}>Editar</button>
                            <button type="button" onClick={() => abrirPreciosModelo(modelo)} disabled={guardandoPrecios}>
                              Precios
                            </button>
                            <button type="button" onClick={() => alternarActivo(modelo)} disabled={accionando === modelo.id}>
                              {modelo.activo ? 'Desactivar' : 'Activar'}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modeloPreciosAbierto ? (
        <div className="admin-proyecto-modelos-modal-overlay" role="presentation" onMouseDown={cerrarPreciosModelo}>
          <section className="admin-proyecto-modelos-prices-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-proyecto-modelos-modal-head">
              <div>
                <p className="admin-proyecto-modelos-eyebrow">Precios del modelo</p>
                <h2>{modeloPreciosAbierto.nombre}</h2>
              </div>
              <button type="button" onClick={cerrarPreciosModelo} disabled={guardandoPrecios} aria-label="Cerrar">x</button>
            </div>

            <div className="admin-proyecto-modelos-prices-body">
              <p className="admin-proyecto-modelos-prices-help">Configura el precio por cada esquema de compra o financiamiento.</p>
              {cargandoPrecios ? <p className="admin-proyecto-modelos-empty">Cargando precios...</p> : null}
              {errorPrecios ? <p className="admin-proyecto-modelos-feedback is-error">{errorPrecios}</p> : null}
              {mensajePrecios ? <p className="admin-proyecto-modelos-feedback is-ok">{mensajePrecios}</p> : null}

              {!cargandoPrecios && preciosModelo.length === 0 ? (
                <p className="admin-proyecto-modelos-empty">No se encontraron esquemas en el catalogo.</p>
              ) : null}

              {!cargandoPrecios && preciosModelo.length > 0 ? (
                <div className="admin-proyecto-modelos-prices-table-wrap">
                  <table className="admin-proyecto-modelos-prices-table">
                    <thead>
                      <tr>
                        <th>Esquema</th>
                        <th>Precio</th>
                        <th>Descripcion</th>
                        <th>Activo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preciosModelo.map((fila, index) => (
                        <tr key={fila.id || `${modeloPreciosAbierto.id}-precio-${index}`}>
                          <td data-label="Esquema">
                            <strong>{fila.tipoPrecioNombre}</strong>
                            {fila.tipoPrecioCodigo ? <small>{fila.tipoPrecioCodigo}</small> : null}
                          </td>
                          <td data-label="Precio">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={fila.precio}
                              onChange={(event) => actualizarPrecioModeloFila(index, { precio: event.target.value })}
                              disabled={!fila.activo}
                              placeholder="0"
                            />
                            <small>{fila.precio !== '' && fila.precio !== null ? formatearMonedaMXN(fila.precio) : 'MXN'}</small>
                          </td>
                          <td data-label="Descripcion">
                            <input
                              value={fila.descripcion}
                              onChange={(event) => actualizarPrecioModeloFila(index, { descripcion: event.target.value })}
                              placeholder="Opcional"
                            />
                          </td>
                          <td data-label="Activo">
                            <label className="admin-proyecto-modelos-check">
                              <input
                                type="checkbox"
                                checked={fila.activo}
                                onChange={(event) => actualizarPrecioModeloFila(index, { activo: event.target.checked })}
                              />
                              <span>{fila.activo ? 'Si' : 'No'}</span>
                            </label>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>

            <div className="admin-proyecto-modelos-modal-actions">
              <button type="button" onClick={guardarPreciosDelModelo} disabled={guardandoPrecios || cargandoPrecios || preciosModelo.length === 0}>
                {guardandoPrecios ? 'Guardando...' : 'Guardar precios del modelo'}
              </button>
              <button type="button" onClick={cerrarPreciosModelo} disabled={guardandoPrecios}>Cerrar</button>
            </div>
          </section>
        </div>
      ) : null}
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
                <label className="is-full"><span>Descripción</span><textarea name="descripcion" value={form.descripcion} onChange={actualizarCampo} rows="4" /></label>
                <label><span>Recámaras</span><input name="recamaras" type="number" min="0" step="1" value={form.recamaras} onChange={actualizarCampo} /></label>
                <label><span>Baños</span><input name="banos" type="number" min="0" step="0.5" value={form.banos} onChange={actualizarCampo} /></label>
                <label><span>Medios baños</span><input name="mediosBanos" type="number" min="0" step="1" value={form.mediosBanos} onChange={actualizarCampo} /></label>
                <label><span>Estacionamientos</span><input name="estacionamientos" type="number" min="0" step="1" value={form.estacionamientos} onChange={actualizarCampo} /></label>
                <label><span>Niveles</span><input name="niveles" type="number" min="0" step="1" value={form.niveles} onChange={actualizarCampo} /></label>
                <label><span>Superficie terreno m2</span><input name="superficieTerrenoM2" type="number" min="0" step="0.01" value={form.superficieTerrenoM2} onChange={actualizarCampo} /></label>
                <label><span>Superficie construccion m2</span><input name="superficieConstruccionM2" type="number" min="0" step="0.01" value={form.superficieConstruccionM2} onChange={actualizarCampo} /></label>
                <label><span>Precio desde</span><input name="precioDesde" type="number" min="0" step="0.01" value={form.precioDesde} onChange={actualizarCampo} /></label>
                <label><span>Orden</span><input name="orden" type="number" min="0" step="1" value={form.orden} onChange={actualizarCampo} /></label>
                {puedeEditarModelo ? (
                  <div className="admin-proyecto-modelos-image-upload is-full">
                    <div className="admin-proyecto-modelos-image-upload-head">
                      <div>
                        <span>Imagen principal del modelo</span>
                        <p>Imagen publica que se mostrara en la ficha del modelo.</p>
                      </div>
                    </div>
                    <div className="admin-proyecto-modelos-image-preview">
                      {getPreviewUrl(modeloEditando, imagenPreview) ? (
                        <img src={getPreviewUrl(modeloEditando, imagenPreview)} alt="Vista previa de imagen principal del modelo" />
                      ) : (
                        <span>Sin imagen del modelo</span>
                      )}
                    </div>
                    <label className="admin-proyecto-modelos-file">
                      <span>Seleccionar archivo</span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        onChange={(event) => {
                          seleccionarImagen(event.target.files?.[0]);
                          event.target.value = '';
                        }}
                      />
                      <small>JPG, JPEG, PNG o WEBP. Tamaño máximo 10MB.</small>
                    </label>
                    {modeloEditando?.imagenPrincipalUrl ? (
                      <p className="admin-proyecto-modelos-image-current">URL actual: {modeloEditando.imagenPrincipalUrl}</p>
                    ) : null}
                    {imagenFile ? (
                      <p className="admin-proyecto-modelos-image-current">Archivo seleccionado: {imagenFile.name}</p>
                    ) : null}
                  </div>
                ) : null}
                <label className="is-full"><span>Tour 360 URL</span><input name="tour360Url" value={form.tour360Url} onChange={actualizarCampo} /></label>
              </div>
              <div className="admin-proyecto-modelos-modal-actions">
                <button type="submit" disabled={guardando || !puedeEditarModelo}>{guardando ? 'Guardando...' : 'Guardar modelo'}</button>
                <button type="button" onClick={cerrarModal} disabled={guardando}>Cancelar</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}






