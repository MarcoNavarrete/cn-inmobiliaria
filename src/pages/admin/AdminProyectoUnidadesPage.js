import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { listarModelos } from '../../services/proyectoModelosService';
import {
  actualizarUnidad,
  confirmarImportCsv,
  crearUnidad,
  descargarPlantillaCsv,
  listarUnidades,
  previewImportCsv,
  setUnidadActivo,
  setUnidadEstatus,
} from '../../services/proyectoUnidadesService';
import { obtenerProyecto } from '../../services/proyectosInmobiliariosService';
import {
  eliminarPreciosPersonalizadosUnidadProyecto,
  guardarPreciosUnidadProyecto,
  listarPreciosModeloProyecto,
  listarPreciosUnidadProyecto,
  listarTiposPrecioInmobiliario,
} from '../../services/proyectoPreciosService';
import {
  formatearMonedaMXN,
  obtenerResumenPrecios,
  normalizarPreciosInmobiliarios,
} from '../../utils/preciosInmobiliarios';
import usePermisosEmpresa from '../../hooks/usePermisosEmpresa';
import './AdminProyectoUnidadesPage.css';

const TIPOS_UNIDAD = ['LOTE', 'CASA', 'DEPARTAMENTO', 'LOCAL', 'OFICINA', 'MACROLOTE', 'OTRO'];
const ESTATUS_UNIDAD = ['DISPONIBLE', 'APARTADO', 'EN_PROCESO', 'VENDIDO', 'LIQUIDADO', 'BLOQUEADO', 'NO_DISPONIBLE'];
const ESTATUS_CONFIRMACION = ['VENDIDO', 'LIQUIDADO', 'BLOQUEADO', 'NO_DISPONIBLE'];
const MAX_CSV_SIZE = 5 * 1024 * 1024;
const MAX_PREVIEW_ROWS = 50;

const FILTROS_INICIALES = {
  texto: '',
  tipoUnidad: '',
  estatus: '',
  modeloId: '',
  soloActivas: 'true',
};

const FORM_INICIAL = {
  tipoUnidad: 'LOTE',
  modeloId: '',
  codigo: '',
  nombre: '',
  manzana: '',
  lote: '',
  torre: '',
  nivel: '',
  numeroInterior: '',
  superficieTerrenoM2: '',
  superficieConstruccionM2: '',
  precioM2: '',
  precioTotal: '',
  estatus: 'DISPONIBLE',
  svgElementId: '',
  colorHex: '',
  observaciones: '',
  destacado: false,
  visiblePublico: true,
};

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible procesar la accion.';

const hasPrecioValue = (value) => value !== '' && value !== null && value !== undefined;

const parsePrecioValue = (value) => {
  if (!hasPrecioValue(value)) return null;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
};

const getTipoPrecioIdValue = (fila = {}) => {
  const value = fila.tipoPrecioId ?? fila.tipoPrecioInmobiliarioId ?? fila.catalogoTipoPrecioId;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const getTipoPrecioKeys = (item = {}) => [
  item.tipoPrecioId,
  item.tipoPrecioInmobiliarioId,
  item.id,
  item.codigo,
  item.tipoPrecioCodigo,
  item.nombre,
  item.tipoPrecioNombre,
]
  .map((value) => String(value || '').trim().toUpperCase())
  .filter(Boolean);

const findPrecioByTipo = (precios = [], tipo = {}) => {
  const keys = new Set(getTipoPrecioKeys(tipo));
  return precios.find((precio) => getTipoPrecioKeys(precio).some((key) => keys.has(key))) || null;
};

const buildPrecioUnidadRowKey = (fila = {}, index = 0) => {
  const tipoPrecioId = getTipoPrecioIdValue(fila);
  if (tipoPrecioId) return `precio-proyecto-unidad-${tipoPrecioId}`;
  return `precio-proyecto-unidad-${fila.tipoPrecioCodigo || 'tipo'}-${index}`;
};

const isPrecioPersonalizadoActivoInvalido = (fila = {}) => {
  if (fila.activo === false) return false;
  const precio = parsePrecioValue(fila.precioPersonalizado);
  return precio === null || precio <= 0;
};


const pickFirst = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const toInputValue = (value) =>
  value === null || value === undefined ? '' : String(value);

const toNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isNaN(number) ? 0 : number;
};

const normalizeMessages = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  return [String(value)].filter(Boolean);
};

const normalizeCsvPreview = (data = {}) => {
  const rows = pickFirst(data.filas, data.rows, data.detalles, data.items, data.preview, data.data?.filas, data.data?.rows, []);
  const filas = Array.isArray(rows) ? rows : [];
  const filasNormalizadas = filas.map((row, index) => {
    const errores = normalizeMessages(pickFirst(row.errores, row.errors, row.error));
    const advertencias = normalizeMessages(pickFirst(row.advertencias, row.warnings, row.warning));

    return {
      key: `${pickFirst(row.fila, row.rowNumber, row.linea, index + 1)}-${index}`,
      fila: pickFirst(row.fila, row.rowNumber, row.linea, index + 1),
      accion: pickFirst(row.accion, row.action, row.accionDetectada, row.tipoAccion, '-'),
      unidadId: pickFirst(row.unidadId, row.id, row.proyectoUnidadId, '-'),
      codigo: pickFirst(row.codigo, row.codigoUnidad, row.clave, '-'),
      tipoUnidad: pickFirst(row.tipoUnidad, row.tipo, '-'),
      estatus: pickFirst(row.estatus, row.status, row.estado, '-'),
      svgElementId: pickFirst(row.svgElementId, row.svgId, row.elementoSvgId, '-'),
      errores,
      advertencias,
    };
  });

  const resumen = pickFirst(data.resumen, data.summary, data.data?.resumen, data);
  const totalErroresCalculado = filasNormalizadas.reduce((acc, row) => acc + row.errores.length, 0);
  const totalAdvertenciasCalculado = filasNormalizadas.reduce((acc, row) => acc + row.advertencias.length, 0);

  return {
    raw: data,
    mensaje: pickFirst(data.mensaje, data.message, data.data?.mensaje, ''),
    totalFilas: toNumber(pickFirst(resumen.totalFilas, resumen.totalRows, resumen.filas, filasNormalizadas.length)),
    totalCrear: toNumber(pickFirst(resumen.totalCrear, resumen.totalCreadas, resumen.crear, resumen.created, resumen.toCreate)),
    totalActualizar: toNumber(pickFirst(resumen.totalActualizar, resumen.totalActualizadas, resumen.actualizar, resumen.updated, resumen.toUpdate)),
    totalErrores: toNumber(pickFirst(resumen.totalErrores, resumen.errores, resumen.errors, totalErroresCalculado)),
    totalAdvertencias: toNumber(pickFirst(resumen.totalAdvertencias, resumen.advertencias, resumen.warnings, totalAdvertenciasCalculado)),
    filas: filasNormalizadas,
  };
};

const mapUnidadToForm = (unidad = {}) => ({
  tipoUnidad: unidad.tipoUnidad || 'LOTE',
  modeloId: toInputValue(unidad.modeloId),
  codigo: unidad.codigo || '',
  nombre: unidad.nombre || '',
  manzana: unidad.manzana || '',
  lote: unidad.lote || '',
  torre: unidad.torre || '',
  nivel: unidad.nivel || '',
  numeroInterior: unidad.numeroInterior || '',
  superficieTerrenoM2: toInputValue(unidad.superficieTerrenoM2),
  superficieConstruccionM2: toInputValue(unidad.superficieConstruccionM2),
  precioM2: toInputValue(unidad.precioM2),
  precioTotal: toInputValue(unidad.precioTotal),
  estatus: unidad.estatus || 'DISPONIBLE',
  svgElementId: unidad.svgElementId || '',
  colorHex: unidad.colorHex || '',
  observaciones: unidad.observaciones || '',
  destacado: unidad.destacado === true,
  visiblePublico: unidad.visiblePublico !== false,
});

const buildPayload = (form, proyectoId) => ({
  proyectoId: toNumberOrNull(proyectoId),
  tipoUnidad: form.tipoUnidad,
  modeloId: form.modeloId ? toNumberOrNull(form.modeloId) : null,
  codigo: form.codigo.trim(),
  nombre: form.nombre.trim() || null,
  manzana: form.manzana.trim() || null,
  lote: form.lote.trim() || null,
  torre: form.torre.trim() || null,
  nivel: form.nivel.trim() || null,
  numeroInterior: form.numeroInterior.trim() || null,
  superficieTerrenoM2: toNumberOrNull(form.superficieTerrenoM2),
  superficieConstruccionM2: toNumberOrNull(form.superficieConstruccionM2),
  precioM2: toNumberOrNull(form.precioM2),
  precioTotal: toNumberOrNull(form.precioTotal),
  estatus: form.estatus,
  svgElementId: form.svgElementId.trim() || null,
  colorHex: form.colorHex.trim() || null,
  observaciones: form.observaciones.trim() || null,
  destacado: form.destacado === true,
  visiblePublico: form.visiblePublico === true,
});

export default function AdminProyectoUnidadesPage() {
  const permisosEmpresa = usePermisosEmpresa();
  const puedeEditarUnidades = permisosEmpresa.puedeEditarUnidades;
  const puedeImportarCsv = permisosEmpresa.puedeImportarCsv;
  const { proyectoId } = useParams();
  const [proyecto, setProyecto] = useState(null);
  const [modelos, setModelos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [filtrosAplicados, setFiltrosAplicados] = useState(FILTROS_INICIALES);
  const [modalOpen, setModalOpen] = useState(false);
  const [unidadEditando, setUnidadEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState(null);
  const [csvResultado, setCsvResultado] = useState(null);
  const [csvError, setCsvError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [descargandoPlantilla, setDescargandoPlantilla] = useState(false);
  const [procesandoCsv, setProcesandoCsv] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [accionando, setAccionando] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [unidadPreciosAbierta, setUnidadPreciosAbierta] = useState(null);
  const [tiposPrecio, setTiposPrecio] = useState([]);
  const [preciosUnidadEditando, setPreciosUnidadEditando] = useState([]);
  const [preciosUnidadPersonalizados, setPreciosUnidadPersonalizados] = useState(false);
  const [cargandoPrecios, setCargandoPrecios] = useState(false);
  const [guardandoPrecios, setGuardandoPrecios] = useState(false);
  const [errorPrecios, setErrorPrecios] = useState('');
  const [mensajePrecios, setMensajePrecios] = useState('');
  const [mensajeCompartirPlano, setMensajeCompartirPlano] = useState('');

  const modeloPorId = useMemo(
    () => Object.fromEntries(modelos.map((modelo) => [String(modelo.id), modelo])),
    [modelos]
  );

  const publicPlanoUrl = useMemo(() => {
    const slug = String(proyecto?.slug || '').trim();
    if (!slug || typeof window === 'undefined') return '';

    return `${window.location.origin}${window.location.pathname}#/proyectos-inmobiliarios/${encodeURIComponent(slug)}/plano`;
  }, [proyecto?.slug]);

  useEffect(() => {
    if (!mensajeCompartirPlano) return undefined;

    const timeoutId = window.setTimeout(() => setMensajeCompartirPlano(''), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [mensajeCompartirPlano]);

  const cargarDatos = useCallback(async (options = {}) => {
    setCargando(true);
    setError('');

    try {
      const [proyectoData, modelosData, unidadesData] = await Promise.all([
        obtenerProyecto(proyectoId, { signal: options.signal }),
        listarModelos(proyectoId, { soloActivos: true, signal: options.signal }),
        listarUnidades(proyectoId, {
          texto: filtrosAplicados.texto.trim(),
          tipoUnidad: filtrosAplicados.tipoUnidad,
          estatus: filtrosAplicados.estatus,
          modeloId: filtrosAplicados.modeloId,
          soloActivas: filtrosAplicados.soloActivas === 'true',
          signal: options.signal,
        }),
      ]);

      setProyecto(proyectoData);
      setModelos(modelosData);
      setUnidades(unidadesData);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(getApiErrorMessage(err));
      }
    } finally {
      if (!options.signal?.aborted) {
        setCargando(false);
      }
    }
  }, [filtrosAplicados, proyectoId]);

  useEffect(() => {
    const controller = new AbortController();
    cargarDatos({ signal: controller.signal });
    return () => controller.abort();
  }, [cargarDatos]);

  const actualizarFiltro = (event) => {
    const { name, value } = event.target;
    setFiltros((actual) => ({ ...actual, [name]: value }));
  };

  const aplicarFiltros = (event) => {
    event.preventDefault();
    setFiltrosAplicados(filtros);
  };

  const limpiarFiltros = () => {
    setFiltros(FILTROS_INICIALES);
    setFiltrosAplicados(FILTROS_INICIALES);
  };

  const copiarPlanoPublico = async () => {
    if (!publicPlanoUrl) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicPlanoUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = publicPlanoUrl;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setMensajeCompartirPlano('Enlace copiado.');
    } catch (_) {
      setMensajeCompartirPlano('No se pudo copiar el enlace.');
    }
  };

  const compartirPlanoWhatsapp = () => {
    if (!publicPlanoUrl) return;

    const nombreProyecto = proyecto?.nombre || 'este proyecto';
    const whatsappText = `Hola, te comparto el plano interactivo del proyecto ${nombreProyecto}: ${publicPlanoUrl}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(whatsappText)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const abrirPlanoPublico = () => {
    if (!publicPlanoUrl) return;
    window.open(publicPlanoUrl, '_blank', 'noopener,noreferrer');
  };

  const abrirNuevaUnidad = () => {
    setUnidadEditando(null);
    setForm(FORM_INICIAL);
    setError('');
    setModalOpen(true);
  };

  const abrirEditarUnidad = (unidad) => {
    setUnidadEditando(unidad);
    setForm(mapUnidadToForm(unidad));
    setError('');
    setModalOpen(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModalOpen(false);
    setUnidadEditando(null);
    setForm(FORM_INICIAL);
  };

  const actualizarCampo = (event) => {
    const { checked, name, type, value } = event.target;
    setForm((actual) => ({
      ...actual,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validar = () => {
    if (!form.tipoUnidad) return 'Selecciona el tipo de unidad.';
    if (!form.codigo.trim()) return 'El codigo es requerido.';
    if (!form.estatus) return 'Selecciona el estatus.';
    if (form.modeloId && Number.isNaN(Number(form.modeloId))) return 'El modelo seleccionado no es valido.';

    const numericos = [
      ['precioM2', 'Precio m2'],
      ['precioTotal', 'Precio total'],
      ['superficieTerrenoM2', 'Superficie terreno'],
      ['superficieConstruccionM2', 'Superficie construccion'],
    ];

    for (const [key, label] of numericos) {
      if (form[key] !== '' && Number(form[key]) < 0) {
        return `${label} no puede ser negativo.`;
      }
    }

    return '';
  };

  const guardarUnidad = async (event) => {
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

      if (unidadEditando) {
        await actualizarUnidad(unidadEditando.id, payload);
        setMensaje('Unidad actualizada correctamente.');
      } else {
        await crearUnidad(proyectoId, payload);
        setMensaje('Unidad creada correctamente.');
      }

      setModalOpen(false);
      setUnidadEditando(null);
      setForm(FORM_INICIAL);
      await cargarDatos();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstatus = async (unidad, estatus) => {
    if (!estatus || estatus === unidad.estatus) return;

    if (ESTATUS_CONFIRMACION.includes(estatus) && !window.confirm(`Cambiar la unidad "${unidad.codigo}" a ${estatus}?`)) {
      return;
    }

    setAccionando(`${unidad.id}-estatus`);
    setError('');
    setMensaje('');

    try {
      await setUnidadEstatus(unidad.id, estatus);
      setMensaje('Estatus actualizado correctamente.');
      await cargarDatos();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionando('');
    }
  };

  const alternarActivo = async (unidad) => {
    const siguiente = !unidad.activo;

    if (!siguiente && !window.confirm(`Desactivar la unidad "${unidad.codigo}"?`)) {
      return;
    }

    setAccionando(`${unidad.id}-activo`);
    setError('');
    setMensaje('');

    try {
      await setUnidadActivo(unidad.id, siguiente);
      setMensaje(`Unidad ${siguiente ? 'activada' : 'desactivada'} correctamente.`);
      await cargarDatos();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionando('');
    }
  };

  const copiarSvgElementId = async (svgElementId) => {
    if (!svgElementId) return;

    try {
      await navigator.clipboard.writeText(svgElementId);
      setMensaje('SvgElementId copiado al portapapeles.');
    } catch (_) {
      setMensaje(`SvgElementId: ${svgElementId}`);
    }
  };

  const validarArchivoCsv = (file) => {
    if (!file) return 'Selecciona un archivo CSV.';
    const extension = String(file.name || '').split('.').pop().toLowerCase();
    if (extension !== 'csv') return 'El archivo debe tener extension .csv.';
    if (file.size > MAX_CSV_SIZE) return 'El archivo CSV no debe pesar mas de 5MB.';
    return '';
  };

  const descargarCsv = async () => {
    setDescargandoPlantilla(true);
    setError('');
    setMensaje('');

    try {
      await descargarPlantillaCsv(proyectoId);
      setMensaje('Plantilla CSV descargada correctamente.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setDescargandoPlantilla(false);
    }
  };

  const abrirCsvModal = () => {
    setCsvModalOpen(true);
    setCsvFile(null);
    setCsvPreview(null);
    setCsvResultado(null);
    setCsvError('');
  };

  const cerrarCsvModal = () => {
    if (procesandoCsv) return;
    setCsvModalOpen(false);
    setCsvFile(null);
    setCsvPreview(null);
    setCsvResultado(null);
    setCsvError('');
  };

  const seleccionarCsv = (file) => {
    setCsvError('');
    setCsvPreview(null);
    setCsvResultado(null);

    const validacion = validarArchivoCsv(file);
    if (validacion) {
      setCsvFile(null);
      setCsvError(validacion);
      return;
    }

    setCsvFile(file);
  };

  const previsualizarCsv = async () => {
    const validacion = validarArchivoCsv(csvFile);
    if (validacion) {
      setCsvError(validacion);
      return;
    }

    setProcesandoCsv(true);
    setCsvError('');
    setCsvResultado(null);

    try {
      const data = await previewImportCsv(proyectoId, csvFile);
      setCsvPreview(normalizeCsvPreview(data));
    } catch (err) {
      setCsvPreview(null);
      setCsvError(getApiErrorMessage(err));
    } finally {
      setProcesandoCsv(false);
    }
  };

  const confirmarCsv = async () => {
    const validacion = validarArchivoCsv(csvFile);
    if (validacion) {
      setCsvError(validacion);
      return;
    }

    if (csvPreview?.totalErrores > 0) {
      setCsvError('Corrige los errores en el CSV antes de importar.');
      return;
    }

    if (!window.confirm('Se crearan/actualizaran unidades del proyecto. Deseas continuar?')) {
      return;
    }

    setProcesandoCsv(true);
    setCsvError('');

    try {
      const data = await confirmarImportCsv(proyectoId, csvFile);
      const resultado = normalizeCsvPreview(data);
      setCsvResultado(resultado);
      setMensaje('Importacion CSV completada correctamente.');
      await cargarDatos();
    } catch (err) {
      setCsvError(getApiErrorMessage(err));
    } finally {
      setProcesandoCsv(false);
    }
  };

  const cargarCatalogoPrecios = useCallback(async () => {
    if (tiposPrecio.length > 0) {
      return tiposPrecio;
    }

    try {
      const tipos = await listarTiposPrecioInmobiliario();
      setTiposPrecio(tipos);
      return tipos;
    } catch (err) {
      if (err.name !== 'AbortError') {
        setTiposPrecio([]);
      }
      return [];
    }
  }, [tiposPrecio]);

  const abrirPreciosUnidad = async (unidad) => {
    setUnidadPreciosAbierta(unidad);
    setCargandoPrecios(true);
    setErrorPrecios('');
    setMensajePrecios('');
    setPreciosUnidadEditando([]);
    setPreciosUnidadPersonalizados(false);

    try {
      const [tipos, preciosModeloData, preciosUnidadData] = await Promise.all([
        cargarCatalogoPrecios(),
        unidad.modeloId ? listarPreciosModeloProyecto(unidad.modeloId).catch(() => []) : Promise.resolve([]),
        listarPreciosUnidadProyecto(unidad.id).catch(() => []),
      ]);

      const preciosModeloFuente = preciosModeloData.length > 0
        ? preciosModeloData
        : normalizarPreciosInmobiliarios(unidad.preciosModelo || unidad.modelo?.precios || unidad.modeloPrecios || unidad.preciosBase || []);
      const preciosUnidadFuente = preciosUnidadData.length > 0
        ? preciosUnidadData
        : normalizarPreciosInmobiliarios(unidad.preciosPersonalizados || unidad.precios || unidad.tarifasPersonalizadas || []);
      const resumenModelo = obtenerResumenPrecios({
        precios: preciosModeloFuente,
        fallbackPrecio: unidad.precioDesde ?? unidad.precioTotal ?? null,
      });
      const unidadTienePersonalizados =
        unidad.precioOrigen === 'PERSONALIZADO' ||
        unidad.precioOrigen === 'UNIDAD' ||
        unidad.precioOrigenEtiqueta === 'Personalizado' ||
        preciosUnidadFuente.some((precio) => Boolean(
          precio?.esPersonalizado ||
          precio?.origenPrecio === 'UNIDAD' ||
          precio?.origenPrecio === 'PERSONALIZADO' ||
          hasPrecioValue(precio?.precioPersonalizado)
        ));
      const fuenteFilas = preciosUnidadFuente.length > 0
        ? preciosUnidadFuente
        : preciosModeloFuente.length > 0
          ? preciosModeloFuente
          : tipos.length > 0
            ? tipos
            : resumenModelo.precios;
      const fallbackPrecio = unidad.precioDesde ?? unidad.precioTotal ?? '';
      const filasFuente = fuenteFilas.length > 0 ? fuenteFilas : [{
        id: 'precio-actual',
        tipoPrecioId: '',
        tipoPrecioCodigo: 'FALLBACK',
        tipoPrecioNombre: 'Precio actual',
        descripcion: '',
        precio: fallbackPrecio,
        activo: true,
        tipoPrecioActivo: true,
        orden: 0,
      }];

      const filas = filasFuente
        .map((tipo, index) => {
          const precioModelo = findPrecioByTipo(preciosModeloFuente, tipo);
          const precioUnidad = preciosUnidadFuente.includes(tipo) ? tipo : findPrecioByTipo(preciosUnidadFuente, tipo);
          const tipoPrecioId = getTipoPrecioIdValue(precioUnidad) || getTipoPrecioIdValue(precioModelo) || getTipoPrecioIdValue(tipo);
          const precioHeredado = precioUnidad?.precioHeredado ?? (!precioUnidad?.esPersonalizado ? precioUnidad?.precio : undefined) ?? precioModelo?.precio ?? (index === 0 ? fallbackPrecio : '');
          const precioPersonalizado = precioUnidad?.precioPersonalizado ?? precioUnidad?.precioUnidad ?? (precioUnidad?.esPersonalizado ? precioUnidad?.precio : '');
          const precioEfectivo = precioUnidad?.precioEfectivo ?? precioUnidad?.precio ?? precioPersonalizado ?? precioHeredado;
          const tipoPrecioActivo = (precioUnidad?.tipoPrecioActivo ?? precioModelo?.tipoPrecioActivo ?? tipo.tipoPrecioActivo ?? tipo.activo ?? true) !== false;
          const rowKey = buildPrecioUnidadRowKey({
            tipoPrecioId,
            tipoPrecioCodigo: precioUnidad?.tipoPrecioCodigo || precioModelo?.tipoPrecioCodigo || tipo.codigo || tipo.tipoPrecioCodigo || '',
          }, index);

          return {
            id: rowKey,
            rowKey,
            precioId: precioUnidad?.precioId || precioUnidad?.id || null,
            tipoPrecioId: tipoPrecioId || '',
            tipoPrecioCodigo: precioUnidad?.tipoPrecioCodigo || precioModelo?.tipoPrecioCodigo || tipo.codigo || tipo.tipoPrecioCodigo || '',
            tipoPrecioNombre: precioUnidad?.tipoPrecioNombre || precioModelo?.tipoPrecioNombre || tipo.nombre || tipo.tipoPrecioNombre || tipo.descripcion || `Esquema ${index + 1}`,
            precioHeredado,
            precioHeredadoTexto: formatearMonedaMXN(precioHeredado),
            precioPersonalizado: hasPrecioValue(precioPersonalizado) ? String(precioPersonalizado) : '',
            precioEfectivo,
            precioEfectivoTexto: formatearMonedaMXN(precioEfectivo),
            descripcion: precioUnidad?.descripcion || precioModelo?.descripcion || tipo.descripcion || '',
            activo: unidadTienePersonalizados ? (precioUnidad?.activo !== false) : Boolean(precioModelo || precioUnidad || index === 0),
            tipoPrecioActivo,
            orden: precioUnidad?.orden ?? precioModelo?.orden ?? tipo.orden ?? index + 1,
          };
        })
        .filter((fila) => fila.tipoPrecioActivo || hasPrecioValue(fila.precioHeredado) || hasPrecioValue(fila.precioPersonalizado) || hasPrecioValue(fila.precioEfectivo));

      setPreciosUnidadEditando(filas);
      setPreciosUnidadPersonalizados(unidadTienePersonalizados);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setErrorPrecios(getApiErrorMessage(err));
      }
    } finally {
      setCargandoPrecios(false);
    }
  };

  const cerrarPreciosUnidad = () => {
    if (guardandoPrecios) return;
    setUnidadPreciosAbierta(null);
    setPreciosUnidadEditando([]);
    setPreciosUnidadPersonalizados(false);
    setErrorPrecios('');
    setMensajePrecios('');
  };

  const actualizarPrecioUnidadFila = (index, cambios) => {
    if ('precioPersonalizado' in cambios) {
      setErrorPrecios('');
    }

    setPreciosUnidadEditando((actuales) =>
      actuales.map((fila, filaIndex) => (filaIndex === index ? { ...fila, ...cambios } : fila))
    );
  };

  const personalizarPreciosUnidad = () => {
    setPreciosUnidadPersonalizados(true);
    setPreciosUnidadEditando((actuales) =>
      actuales.map((fila) => ({
        ...fila,
        precioPersonalizado: hasPrecioValue(fila.precioHeredado)
          ? String(fila.precioHeredado)
          : '',
      }))
    );
  };

  const validarPreciosUnidad = () => {
    if (!preciosUnidadPersonalizados) return '';

    for (const fila of preciosUnidadEditando) {
      if (fila.activo !== false && isPrecioPersonalizadoActivoInvalido(fila)) {
        return `El precio personalizado de ${fila.tipoPrecioNombre} debe ser mayor a $0 si el esquema está activo.`;
      }
    }

    return '';
  };

  const guardarPreciosUnidadEditados = async () => {
    if (!unidadPreciosAbierta?.id) return;

    const unidadActual = unidades.find((item) => String(item.id) === String(unidadPreciosAbierta.id)) || unidadPreciosAbierta;
    const validacion = validarPreciosUnidad();
    if (validacion) {
      setErrorPrecios(validacion);
      return;
    }

    setGuardandoPrecios(true);
    setErrorPrecios('');
    setMensajePrecios('');

    try {
      if (!preciosUnidadPersonalizados) {
        await eliminarPreciosPersonalizadosUnidadProyecto(unidadPreciosAbierta.id);
        await cargarDatos();
        await abrirPreciosUnidad(unidadActual);
        setMensajePrecios('La unidad volvió a heredar los precios del modelo.');
        return;
      }

      const payload = preciosUnidadEditando
        .map((fila, index) => {
          const tipoPrecioId = getTipoPrecioIdValue(fila);
          const precio = parsePrecioValue(fila.precioPersonalizado);

          if (!tipoPrecioId || fila.activo === false || precio === null || precio <= 0) {
            return null;
          }

          return {
            tipoPrecioId,
            precio,
            descripcion: fila.descripcion || null,
            orden: Number(fila.orden || index + 1),
            activo: true,
          };
        })
        .filter(Boolean);

      await guardarPreciosUnidadProyecto(unidadPreciosAbierta.id, payload);
      await cargarDatos();
      await abrirPreciosUnidad(unidadActual);
      setMensajePrecios('Precios personalizados guardados correctamente.');
    } catch (err) {
      setErrorPrecios(getApiErrorMessage(err));
    } finally {
      setGuardandoPrecios(false);
    }
  };
  const volverAHeredarPreciosUnidad = async () => {
    if (!unidadPreciosAbierta?.id) return;
    const unidadActual = unidades.find((item) => String(item.id) === String(unidadPreciosAbierta.id)) || unidadPreciosAbierta;

    setGuardandoPrecios(true);
    setErrorPrecios('');
    setMensajePrecios('');

    try {
      await eliminarPreciosPersonalizadosUnidadProyecto(unidadPreciosAbierta.id);
      await cargarDatos();
      await abrirPreciosUnidad(unidadActual);
        setMensajePrecios('La unidad volvió a heredar los precios del modelo.');
    } catch (err) {
      setErrorPrecios(getApiErrorMessage(err));
    } finally {
      setGuardandoPrecios(false);
    }
  };
  if (cargando) {
    return (
      <main className="admin-proyecto-unidades">
        <p className="admin-proyecto-unidades-feedback">Cargando unidades...</p>
      </main>
    );
  }

  return (
    <main className="admin-proyecto-unidades">
      <section className="admin-proyecto-unidades-hero">
        <div>
          <p className="admin-proyecto-unidades-eyebrow">Unidades / lotes</p>
          <h1>{proyecto?.nombre || 'Proyecto inmobiliario'}</h1>
          <span>{proyecto?.tipoProyecto} - {proyecto?.empresaNombre}</span>
        </div>
        <div className="admin-proyecto-unidades-hero-actions">
          <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/editar`}>Editar proyecto</Link>
          <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/modelos`}>Modelos</Link>
          <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/plano`}>Plano interactivo</Link>
          <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/imagenes`}>Imágenes</Link>
          <Link to={`/admin/proyectos-inmobiliarios/prospectos?proyectoId=${proyectoId}`}>Prospectos</Link>
          <Link to={`/admin/proyectos-inmobiliarios/apartados?proyectoId=${proyectoId}`}>Apartados</Link>
          {puedeEditarUnidades ? <button type="button" onClick={abrirNuevaUnidad}>Nueva unidad</button> : null}
        </div>
      </section>

      {puedeImportarCsv ? (
      <section className="admin-proyecto-unidades-csv-card">
        <div>
          <p className="admin-proyecto-unidades-eyebrow">Carga masiva CSV</p>
          <h2>Importar unidades/lotes</h2>
          <span>Descarga la plantilla, editala en Excel y vuelve a subirla. No cambies los encabezados.</span>
          <small>Si ya existen unidades, la plantilla incluira sus datos actuales para que puedas editarlos y reimportarlos.</small>
          <small>Para vincular unidades al plano interactivo, llena la columna svgElementId con el id del elemento correspondiente en el SVG.</small>
        </div>
        <div className="admin-proyecto-unidades-csv-actions">
          <button type="button" onClick={descargarCsv} disabled={descargandoPlantilla}>
            {descargandoPlantilla ? 'Descargando...' : 'Descargar plantilla CSV'}
          </button>
          <button type="button" onClick={abrirCsvModal}>Importar CSV</button>
        </div>
      </section>
      ) : null}

      <section className="admin-proyecto-unidades-share-card">
        <div className="admin-proyecto-unidades-share-head">
          <div>
            <p className="admin-proyecto-unidades-eyebrow">Plano público</p>
            <h2>Compartir plano del proyecto</h2>
          </div>
          {mensajeCompartirPlano ? (
            <span className="admin-proyecto-unidades-share-feedback" role="status">
              {mensajeCompartirPlano}
            </span>
          ) : null}
        </div>

        {publicPlanoUrl ? (
          <div className="admin-proyecto-unidades-share-content">
            <input
              type="text"
              value={publicPlanoUrl}
              readOnly
              aria-label="URL pública del plano"
              onFocus={(event) => event.target.select()}
            />
            <div className="admin-proyecto-unidades-share-actions">
              <button type="button" onClick={copiarPlanoPublico}>Copiar enlace</button>
              <button type="button" onClick={compartirPlanoWhatsapp}>WhatsApp</button>
              <button type="button" onClick={abrirPlanoPublico}>Ver plano</button>
            </div>
          </div>
        ) : (
          <p className="admin-proyecto-unidades-share-warning">
            Este proyecto aún no tiene slug público configurado.
          </p>
        )}
      </section>

      <form className="admin-proyecto-unidades-filtros" onSubmit={aplicarFiltros}>
        <label>
          <span>Buscar</span>
          <input name="texto" value={filtros.texto} onChange={actualizarFiltro} placeholder="Codigo, manzana, lote, torre, svgElementId" />
        </label>
        <label>
          <span>Tipo</span>
          <select name="tipoUnidad" value={filtros.tipoUnidad} onChange={actualizarFiltro}>
            <option value="">Todos</option>
            {TIPOS_UNIDAD.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
          </select>
        </label>
        <label>
          <span>Estatus</span>
          <select name="estatus" value={filtros.estatus} onChange={actualizarFiltro}>
            <option value="">Todos</option>
            {ESTATUS_UNIDAD.map((estatus) => <option key={estatus} value={estatus}>{estatus}</option>)}
          </select>
        </label>
        <label>
          <span>Modelo</span>
          <select name="modeloId" value={filtros.modeloId} onChange={actualizarFiltro}>
            <option value="">Todos</option>
            {modelos.map((modelo) => <option key={modelo.id} value={modelo.id}>{modelo.nombre}</option>)}
          </select>
        </label>
        <label>
          <span>Activas</span>
          <select name="soloActivas" value={filtros.soloActivas} onChange={actualizarFiltro}>
            <option value="true">Solo activas</option>
            <option value="false">Todas</option>
          </select>
        </label>
        <div className="admin-proyecto-unidades-filter-actions">
          <button type="submit">Buscar</button>
          <button type="button" onClick={limpiarFiltros}>Limpiar</button>
        </div>
      </form>

      {mensaje ? <p className="admin-proyecto-unidades-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="admin-proyecto-unidades-feedback is-error">{error}</p> : null}

      <section className="admin-proyecto-unidades-card">
        {unidades.length === 0 ? (
          <p className="admin-proyecto-unidades-empty">Este proyecto aun no tiene unidades registradas.</p>
        ) : (
          <div className="admin-proyecto-unidades-table-wrap">
            <table className="admin-proyecto-unidades-table">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Tipo</th>
                  <th>Modelo</th>
                  <th>Manzana</th>
                  <th>Lote</th>
                  <th>Torre</th>
                  <th>Nivel</th>
                  <th>Interior</th>
                  <th>Sup. terreno</th>
                  <th>Sup. construccion</th>
                  <th>Precio total</th>
                  <th>Estatus</th>
                  <th>Publico</th>
                  <th>Activo</th>
                  <th>SvgElementId</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {unidades.map((unidad) => (
                  <tr key={unidad.id}>
                    <td data-label="Codigo"><strong>{unidad.codigo}</strong></td>
                    <td data-label="Tipo">{unidad.tipoUnidad}</td>
                    <td data-label="Modelo">{modeloPorId[String(unidad.modeloId)]?.nombre || unidad.modeloNombre}</td>
                    <td data-label="Manzana">{unidad.manzana || '-'}</td>
                    <td data-label="Lote">{unidad.lote || '-'}</td>
                    <td data-label="Torre">{unidad.torre || '-'}</td>
                    <td data-label="Nivel">{unidad.nivel || '-'}</td>
                    <td data-label="Interior">{unidad.numeroInterior || '-'}</td>
                    <td data-label="Sup. terreno">{unidad.superficieTerrenoM2 || '-'}</td>
                    <td data-label="Sup. construccion">{unidad.superficieConstruccionM2 || '-'}</td>
                    <td data-label="Precio total">{unidad.precioTotalTexto}</td>
                    <td data-label="Estatus">
                      <span className={`admin-proyecto-unidades-status is-${unidad.estatus.toLowerCase()}`}>{unidad.estatus}</span>
                    </td>
                    <td data-label="Publico">
                      <span className={`admin-proyecto-unidades-pill ${unidad.visiblePublico ? 'is-ok' : 'is-off'}`}>{unidad.visiblePublico ? 'Visible' : 'Oculto'}</span>
                    </td>
                    <td data-label="Activo">
                      <span className={`admin-proyecto-unidades-pill ${unidad.activo ? 'is-ok' : 'is-off'}`}>{unidad.activo ? 'Activo' : 'Inactivo'}</span>
                    </td>
                    <td data-label="SvgElementId">{unidad.svgElementId || '-'}</td>
                    <td data-label="Acciones">
                      <div className="admin-proyecto-unidades-actions">
                        {puedeEditarUnidades ? (
                          <>
                            <button type="button" onClick={() => abrirEditarUnidad(unidad)}>Editar</button>
                            <select
                              value={unidad.estatus}
                              onChange={(event) => cambiarEstatus(unidad, event.target.value)}
                              disabled={accionando === `${unidad.id}-estatus`}
                            >
                              {ESTATUS_UNIDAD.map((estatus) => <option key={estatus} value={estatus}>{estatus}</option>)}
                            </select>
                            <button
                              type="button"
                              onClick={() => alternarActivo(unidad)}
                              disabled={accionando === `${unidad.id}-activo`}
                            >
                              {unidad.activo ? 'Desactivar' : 'Activar'}
                            </button>
                          </>
                        ) : null}
                        {unidad.svgElementId ? (
                          <button type="button" onClick={() => copiarSvgElementId(unidad.svgElementId)}>
                            Copiar SVG
                          </button>
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

      {unidadPreciosAbierta ? (
        <div className="admin-proyecto-unidades-modal-overlay" role="presentation" onMouseDown={cerrarPreciosUnidad}>
          <section className="admin-proyecto-unidades-prices-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-proyecto-unidades-modal-head">
              <div>
                <p className="admin-proyecto-unidades-eyebrow">Precios de unidad</p>
                <h2>{unidadPreciosAbierta.codigo}</h2>
                <span>{unidadPreciosAbierta.modeloNombre}</span>
              </div>
              <button type="button" onClick={cerrarPreciosUnidad} aria-label="Cerrar" disabled={guardandoPrecios}>x</button>
            </div>

            <div className="admin-proyecto-unidades-modal-summary">
              <article>
                <span>Origen actual</span>
                <strong>{unidadPreciosAbierta.precioOrigenEtiqueta || (preciosUnidadPersonalizados ? 'Personalizado' : 'Modelo')}</strong>
              </article>
              <article>
                <span>Precio efectivo</span>
                <strong>{unidadPreciosAbierta.precioDesdeTexto || unidadPreciosAbierta.precioTotalTexto || formatearMonedaMXN(unidadPreciosAbierta.precioTotal)}</strong>
              </article>
            </div>

            <div className="admin-proyecto-unidades-prices-body">
              {cargandoPrecios ? <p className="admin-proyecto-unidades-empty">Cargando precios...</p> : null}
              {errorPrecios ? <p className="admin-proyecto-unidades-feedback is-error">{errorPrecios}</p> : null}
              {mensajePrecios ? <p className="admin-proyecto-unidades-feedback is-ok">{mensajePrecios}</p> : null}

              {!cargandoPrecios && preciosUnidadEditando.length === 0 ? (
                <p className="admin-proyecto-unidades-empty">No se pudieron cargar esquemas de precio para esta unidad.</p>
              ) : null}

              {!cargandoPrecios && preciosUnidadEditando.length > 0 ? (
                <div className="admin-proyecto-unidades-prices-table-wrap">
                  <table className="admin-proyecto-unidades-prices-table">
                    <thead>
                      <tr>
                        <th>Esquema</th>
                        <th>Precio heredado</th>
                        <th>Precio personalizado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preciosUnidadEditando.map((fila, index) => (
                        <tr key={fila.rowKey || buildPrecioUnidadRowKey(fila, index)}>
                          <td data-label="Esquema">
                            <strong>{fila.tipoPrecioNombre}</strong>
                            {fila.tipoPrecioCodigo ? <small>{fila.tipoPrecioCodigo}</small> : null}
                            {fila.tipoPrecioActivo === false ? <span className="admin-proyecto-unidades-price-badge is-inactive">Inactivo</span> : null}
                          </td>
                          <td data-label="Precio heredado">
                            <strong>{fila.precioHeredadoTexto || formatearMonedaMXN(fila.precioHeredado)}</strong>
                          </td>
                          <td data-label="Precio personalizado">
                            <input
                              type="text"
                              inputMode="decimal"
                              className={errorPrecios && preciosUnidadPersonalizados && isPrecioPersonalizadoActivoInvalido(fila) ? 'is-invalid' : ''}
                              value={fila.precioPersonalizado}
                              onChange={(event) => actualizarPrecioUnidadFila(index, { precioPersonalizado: event.target.value })}
                              disabled={!preciosUnidadPersonalizados}
                              placeholder={preciosUnidadPersonalizados ? 'Ej. 1681000' : ''}
                            />
                            <small>
                              {preciosUnidadPersonalizados
                                ? (fila.precioPersonalizado !== '' ? formatearMonedaMXN(fila.precioPersonalizado) : 'Captura un precio para activar el esquema.')
                                : 'Heredado del modelo'}
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>

            <div className="admin-proyecto-unidades-modal-actions">
              {!preciosUnidadPersonalizados ? (
                <button type="button" onClick={personalizarPreciosUnidad} disabled={cargandoPrecios || guardandoPrecios}>
                  Personalizar precios de esta unidad
                </button>
              ) : null}
              {preciosUnidadPersonalizados ? (
                <button type="button" onClick={guardarPreciosUnidadEditados} disabled={cargandoPrecios || guardandoPrecios}>
                  {guardandoPrecios ? 'Guardando...' : 'Guardar precios personalizados'}
                </button>
              ) : null}
              <button
                type="button"
                className="is-secondary"
                onClick={async () => {
                  if (!window.confirm('¿Volver a heredar los precios del modelo?')) return;
                  await volverAHeredarPreciosUnidad();
                }}
                disabled={cargandoPrecios || guardandoPrecios}
              >
                Volver a heredar precios del modelo
              </button>
              <button type="button" onClick={cerrarPreciosUnidad} disabled={cargandoPrecios || guardandoPrecios}>Cerrar</button>
            </div>
          </section>
        </div>
      ) : null}
      {csvModalOpen ? (
        <div className="admin-proyecto-unidades-modal-overlay" role="presentation" onMouseDown={cerrarCsvModal}>
          <section className="admin-proyecto-unidades-csv-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-proyecto-unidades-modal-head">
              <div>
                <p className="admin-proyecto-unidades-eyebrow">Carga masiva CSV</p>
                <h2>Importar unidades/lotes</h2>
              </div>
              <button type="button" onClick={cerrarCsvModal} disabled={procesandoCsv} aria-label="Cerrar">x</button>
            </div>

            <div className="admin-proyecto-unidades-csv-body">
              <p className="admin-proyecto-unidades-csv-help">
                Descarga la plantilla, editala en Excel y vuelve a subirla. No cambies los encabezados.
              </p>
              <label>
                <span>Archivo CSV</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => {
                    seleccionarCsv(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
                <small>Solo .csv. Tamaño máximo 5MB.</small>
              </label>
              {csvFile ? <p className="admin-proyecto-unidades-csv-file">{csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)</p> : null}
              {csvError ? <p className="admin-proyecto-unidades-feedback is-error">{csvError}</p> : null}
              <div className="admin-proyecto-unidades-modal-actions">
                <button type="button" onClick={previsualizarCsv} disabled={procesandoCsv || !csvFile}>
                  {procesandoCsv ? 'Procesando...' : 'Previsualizar'}
                </button>
                <button
                  type="button"
                  onClick={confirmarCsv}
                  disabled={procesandoCsv || !csvFile || !csvPreview || csvPreview.totalErrores > 0}
                >
                  Confirmar importacion
                </button>
              </div>

              {csvPreview ? (
                <section className="admin-proyecto-unidades-csv-preview">
                  <div className="admin-proyecto-unidades-csv-summary">
                    <article><span>Total filas</span><strong>{csvPreview.totalFilas}</strong></article>
                    <article><span>Crear</span><strong>{csvPreview.totalCrear}</strong></article>
                    <article><span>Actualizar</span><strong>{csvPreview.totalActualizar}</strong></article>
                    <article className={csvPreview.totalErrores ? 'is-danger' : 'is-ok'}><span>Errores</span><strong>{csvPreview.totalErrores}</strong></article>
                    <article className={csvPreview.totalAdvertencias ? 'is-warning' : 'is-ok'}><span>Advertencias</span><strong>{csvPreview.totalAdvertencias}</strong></article>
                  </div>
                  {csvPreview.totalErrores > 0 ? (
                    <p className="admin-proyecto-unidades-csv-alert is-danger">Corrige los errores en el CSV antes de importar.</p>
                  ) : (
                    <p className="admin-proyecto-unidades-csv-alert is-ok">El archivo esta listo para importarse.</p>
                  )}
                  <p className="admin-proyecto-unidades-csv-note">Mostrando las primeras {Math.min(MAX_PREVIEW_ROWS, csvPreview.filas.length)} filas del preview.</p>
                  <div className="admin-proyecto-unidades-csv-table-wrap">
                    <table className="admin-proyecto-unidades-csv-table">
                      <thead>
                        <tr>
                          <th>Fila</th>
                          <th>Accion</th>
                          <th>UnidadId</th>
                          <th>Codigo</th>
                          <th>Tipo</th>
                          <th>Estatus</th>
                          <th>SvgElementId</th>
                          <th>Errores</th>
                          <th>Advertencias</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.filas.slice(0, MAX_PREVIEW_ROWS).map((row) => (
                          <tr key={row.key}>
                            <td>{row.fila}</td>
                            <td>{row.accion}</td>
                            <td>{row.unidadId}</td>
                            <td><strong>{row.codigo}</strong></td>
                            <td>{row.tipoUnidad}</td>
                            <td>{row.estatus}</td>
                            <td>{row.svgElementId}</td>
                            <td>
                              {row.errores.length ? row.errores.map((item) => <span key={item} className="admin-proyecto-unidades-csv-badge is-error">{item}</span>) : '-'}
                            </td>
                            <td>
                              {row.advertencias.length ? row.advertencias.map((item) => <span key={item} className="admin-proyecto-unidades-csv-badge is-warning">{item}</span>) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              {csvResultado ? (
                <section className="admin-proyecto-unidades-csv-result">
                  <h3>Resultado de importacion</h3>
                  <div className="admin-proyecto-unidades-csv-summary">
                    <article><span>Total filas</span><strong>{csvResultado.totalFilas}</strong></article>
                    <article><span>Creadas</span><strong>{csvResultado.totalCrear}</strong></article>
                    <article><span>Actualizadas</span><strong>{csvResultado.totalActualizar}</strong></article>
                    <article className={csvResultado.totalErrores ? 'is-danger' : 'is-ok'}><span>Errores</span><strong>{csvResultado.totalErrores}</strong></article>
                  </div>
                  {csvResultado.mensaje ? <p className="admin-proyecto-unidades-csv-alert is-ok">{csvResultado.mensaje}</p> : null}
                </section>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {modalOpen ? (
        <div className="admin-proyecto-unidades-modal-overlay" role="presentation" onMouseDown={cerrarModal}>
          <section className="admin-proyecto-unidades-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-proyecto-unidades-modal-head">
              <div>
                <p className="admin-proyecto-unidades-eyebrow">Unidad</p>
                <h2>{unidadEditando ? 'Editar unidad' : 'Nueva unidad'}</h2>
              </div>
              <button type="button" onClick={cerrarModal} disabled={guardando} aria-label="Cerrar">x</button>
            </div>
            <form onSubmit={guardarUnidad}>
              <div className="admin-proyecto-unidades-form-grid">
                <label><span>Tipo unidad</span><select name="tipoUnidad" value={form.tipoUnidad} onChange={actualizarCampo} required>{TIPOS_UNIDAD.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}</select></label>
                <label><span>Modelo</span><select name="modeloId" value={form.modeloId} onChange={actualizarCampo}><option value="">Ninguno</option>{modelos.map((modelo) => <option key={modelo.id} value={modelo.id}>{modelo.nombre}</option>)}</select></label>
                <label><span>Codigo</span><input name="codigo" value={form.codigo} onChange={actualizarCampo} required /></label>
                <label><span>Nombre</span><input name="nombre" value={form.nombre} onChange={actualizarCampo} /></label>
                <label><span>Manzana</span><input name="manzana" value={form.manzana} onChange={actualizarCampo} /></label>
                <label><span>Lote</span><input name="lote" value={form.lote} onChange={actualizarCampo} /></label>
                <label><span>Torre</span><input name="torre" value={form.torre} onChange={actualizarCampo} /></label>
                <label><span>Nivel</span><input name="nivel" value={form.nivel} onChange={actualizarCampo} /></label>
                <label><span>Numero interior</span><input name="numeroInterior" value={form.numeroInterior} onChange={actualizarCampo} /></label>
                <label><span>Superficie terreno m2</span><input name="superficieTerrenoM2" type="number" min="0" step="0.01" value={form.superficieTerrenoM2} onChange={actualizarCampo} /></label>
                <label><span>Superficie construccion m2</span><input name="superficieConstruccionM2" type="number" min="0" step="0.01" value={form.superficieConstruccionM2} onChange={actualizarCampo} /></label>
                <label><span>Precio m2</span><input name="precioM2" type="number" min="0" step="0.01" value={form.precioM2} onChange={actualizarCampo} /></label>
                <label><span>Precio total</span><input name="precioTotal" type="number" min="0" step="0.01" value={form.precioTotal} onChange={actualizarCampo} /></label>
                <label><span>Estatus</span><select name="estatus" value={form.estatus} onChange={actualizarCampo} required>{ESTATUS_UNIDAD.map((estatus) => <option key={estatus} value={estatus}>{estatus}</option>)}</select></label>
                <label className="is-full"><span>SvgElementId</span><input name="svgElementId" value={form.svgElementId} onChange={actualizarCampo} /><small>Debe coincidir con el id del elemento dentro del SVG del plano interactivo.</small></label>
                <label className="is-full"><span>ColorHex</span><input name="colorHex" value={form.colorHex} onChange={actualizarCampo} placeholder="#22c55e" /><small>Opcional. Si se deja vacio, el color se calculara por estatus.</small></label>
                <label className="is-full"><span>Observaciones</span><textarea name="observaciones" value={form.observaciones} onChange={actualizarCampo} rows="3" /></label>
                <label className="admin-proyecto-unidades-check"><input name="destacado" type="checkbox" checked={form.destacado} onChange={actualizarCampo} /><span>Destacado</span></label>
                <label className="admin-proyecto-unidades-check"><input name="visiblePublico" type="checkbox" checked={form.visiblePublico} onChange={actualizarCampo} /><span>Visible publico</span></label>
              </div>
              <div className="admin-proyecto-unidades-modal-actions">
                <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar unidad'}</button>
                <button type="button" onClick={cerrarModal} disabled={guardando}>Cancelar</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}











