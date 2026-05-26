import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ESTATUS_UNIDAD,
  actualizarUnidadAdmin,
  crearUnidadAdmin,
  eliminarUnidadAdmin,
  importarUnidadesCsv,
  listarUnidadesAdmin,
} from '../../services/adminDesarrolloUnidadesService';
import {
  eliminarPreciosPersonalizadosUnidad,
  guardarPreciosUnidad,
  listarPreciosModelo,
  listarPreciosUnidad,
  listarTiposPrecioInmobiliario,
} from '../../services/desarrolloPreciosService';
import {
  guardarPlanoAdmin,
  obtenerPlanoAdmin,
  subirPlanoSvgAdmin,
} from '../../services/adminDesarrolloPlanoService';
import { resolveApiAssetUrl } from '../../services/apiClient';
import { listarDesarrolloModelos } from '../../services/adminDesarrollosService';
import {
  formatearMonedaMXN,
  obtenerResumenPrecios,
} from '../../utils/preciosInmobiliarios';
import './AdminDesarrolloUnidadesPage.css';

const FORM_INICIAL = {
  codigoUnidad: '',
  manzana: '',
  lote: '',
  modeloId: '',
  precio: '',
  terrenoM2: '',
  construccionM2: '',
  estatus: 'DISPONIBLE',
  svgElementId: '',
  activo: true,
};
const PLANO_INICIAL = { nombre: '', svgUrl: '', imagenFondoUrl: '', activo: true };
const MAX_SVG_SIZE = 5 * 1024 * 1024;
const SVG_ELEMENT_SELECTOR = 'path[id], polygon[id], rect[id], polyline[id], circle[id], ellipse[id], g[id]';
const PAGE_SIZE_OPTIONS = [25, 50, 100];
const MAX_CSV_SIZE = 10 * 1024 * 1024;

const normalizarSvgId = (value) => String(value || '').trim();
const normalizarBusqueda = (value) => String(value || '').trim().toLowerCase();

const escaparCsv = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const sugerirDesdeSvgElementId = (svgElementId) => {
  const codigoSugerido = normalizarSvgId(svgElementId).replace(/^unidad-/i, '').toUpperCase();
  const match = /^M(\d+)-(\d+)$/i.exec(codigoSugerido);

  return {
    codigoSugerido,
    manzanaSugerida: match ? match[1] : '',
    loteSugerido: match ? match[2] : '',
  };
};

const adaptImportResumen = (response = {}) => {
  const data = response?.data || response;
  const errores = data.errores || data.errors || data.detallesErrores || [];

  return {
    totalFilas: data.totalFilas ?? data.totalRows ?? data.total ?? 0,
    creadas: data.creadas ?? data.created ?? data.insertadas ?? 0,
    actualizadas: data.actualizadas ?? data.updated ?? 0,
    omitidas: data.omitidas ?? data.skipped ?? data.ignoradas ?? 0,
    errores: Array.isArray(errores) ? errores.map((error, index) => ({
      fila: error.fila ?? error.row ?? error.linea ?? index + 1,
      codigo: error.codigo ?? error.codigoUnidad ?? error.code ?? '',
      svgElementId: error.svgElementId ?? error.svgId ?? '',
      error: error.error ?? error.mensaje ?? error.message ?? String(error || ''),
    })) : [],
  };
};

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible procesar unidades.';

const buildFormFromUnidad = (unidad = {}) => ({
  codigoUnidad: unidad.codigoUnidad || '',
  manzana: unidad.manzana || '',
  lote: unidad.lote || '',
  modeloId: unidad.modeloId || '',
  precio: unidad.precio ?? '',
  terrenoM2: unidad.terrenoM2 ?? '',
  construccionM2: unidad.construccionM2 ?? '',
  estatus: unidad.estatus || 'DISPONIBLE',
  svgElementId: unidad.svgElementId || '',
  activo: unidad.activo !== false,
});

function Field({ children, className = '', label }) {
  return (
    <label className={`admin-unidades-field ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function AdminDesarrolloUnidadesPage() {
  const { desarrolloId } = useParams();
  const [unidades, setUnidades] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [planoForm, setPlanoForm] = useState(PLANO_INICIAL);
  const [svgArchivo, setSvgArchivo] = useState(null);
  const [csvArchivo, setCsvArchivo] = useState(null);
  const [subiendoSvg, setSubiendoSvg] = useState(false);
  const [importandoCsv, setImportandoCsv] = useState(false);
  const [mensajeSvg, setMensajeSvg] = useState('');
  const [mensajeCsv, setMensajeCsv] = useState('');
  const [resumenImportacion, setResumenImportacion] = useState(null);
  const [svgIds, setSvgIds] = useState([]);
  const [editandoId, setEditandoId] = useState('');
  const [unidadPreciosAbierta, setUnidadPreciosAbierta] = useState(null);
  const [tiposPrecio, setTiposPrecio] = useState([]);
  const [, setPreciosUnidad] = useState([]);
  const [preciosUnidadEditando, setPreciosUnidadEditando] = useState([]);
  const [preciosUnidadPersonalizados, setPreciosUnidadPersonalizados] = useState(false);
  const [cargandoPrecios, setCargandoPrecios] = useState(false);
  const [guardandoPrecios, setGuardandoPrecios] = useState(false);
  const [errorPrecios, setErrorPrecios] = useState('');
  const [mensajePrecios, setMensajePrecios] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [accionandoId, setAccionandoId] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [busquedaInput, setBusquedaInput] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [estatusFiltro, setEstatusFiltro] = useState('');
  const [modeloFiltro, setModeloFiltro] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const modelosActivos = useMemo(() => modelos.filter((modelo) => modelo.activo !== false), [modelos]);

  const unidadesFiltradas = useMemo(() => {
    const termino = normalizarBusqueda(busqueda);

    return unidades.filter((unidad) => {
      if (estatusFiltro && unidad.estatus !== estatusFiltro) {
        return false;
      }

      if (modeloFiltro && String(unidad.modeloId) !== String(modeloFiltro)) {
        return false;
      }

      if (!termino) {
        return true;
      }

      return [
        unidad.codigoUnidad,
        unidad.svgElementId,
        unidad.modeloNombre,
        unidad.estatus,
        unidad.manzana,
        unidad.lote,
      ].some((value) => normalizarBusqueda(value).includes(termino));
    });
  }, [busqueda, estatusFiltro, modeloFiltro, unidades]);

  const totalPages = Math.max(1, Math.ceil(unidadesFiltradas.length / pageSize));
  const pageActual = Math.min(page, totalPages);
  const unidadesPagina = useMemo(() => {
    const inicio = (pageActual - 1) * pageSize;
    return unidadesFiltradas.slice(inicio, inicio + pageSize);
  }, [pageActual, pageSize, unidadesFiltradas]);

  const diagnosticoSvg = useMemo(() => {
    const idsUnicos = [...new Set(svgIds.map(normalizarSvgId).filter(Boolean))];
    const idsUnidadSvg = idsUnicos.filter((id) => /^unidad-/i.test(id)).sort((a, b) => a.localeCompare(b));
    const idsOtrosSvg = idsUnicos.filter((id) => !/^unidad-/i.test(id)).sort((a, b) => a.localeCompare(b));
    const idsUnidadSet = new Set(idsUnidadSvg);
    const unidadesConSvg = unidades.filter((unidad) => normalizarSvgId(unidad.svgElementId));
    const unidadesSinSvg = unidades.filter((unidad) => !normalizarSvgId(unidad.svgElementId));
    const svgAsignadosCn = [...new Set(unidadesConSvg.map((unidad) => normalizarSvgId(unidad.svgElementId)))];
    const svgAsignadosCnSet = new Set(svgAsignadosCn);
    const vinculadas = unidadesConSvg.filter((unidad) => idsUnidadSet.has(normalizarSvgId(unidad.svgElementId)));
    const svgElementIdNoEncontrados = unidadesConSvg.filter(
      (unidad) => !idsUnidadSet.has(normalizarSvgId(unidad.svgElementId))
    );
    const idsUnidadSvgSinAsignar = idsUnidadSvg.filter((id) => !svgAsignadosCnSet.has(id));

    return {
      idsUnidadSvg,
      idsOtrosSvg,
      idsUnidadSvgSinAsignar,
      svgElementIdNoEncontrados,
      unidadesSinSvg,
      vinculadas,
      resumen: {
        idsUnidadSvg: idsUnidadSvg.length,
        unidadesCn: unidades.length,
        vinculadas: vinculadas.length,
        unidadesSinSvg: unidadesSinSvg.length,
        svgElementIdNoEncontrados: svgElementIdNoEncontrados.length,
        idsUnidadSvgSinAsignar: idsUnidadSvgSinAsignar.length,
        idsOtrosSvg: idsOtrosSvg.length,
      },
    };
  }, [svgIds, unidades]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const cargar = useCallback(async (options = {}) => {
    setCargando(true);
    setError('');

    try {
      const [unidadesData, modelosData] = await Promise.all([
        listarUnidadesAdmin(desarrolloId, options),
        listarDesarrolloModelos(desarrolloId, options),
      ]);
      setUnidades(unidadesData);
      setModelos(modelosData);

      const planoData = await obtenerPlanoAdmin(desarrolloId, options).catch(() => null);
      if (planoData) {
        setPlanoForm({
          nombre: planoData.nombre,
          svgUrl: planoData.svgUrl,
          imagenFondoUrl: planoData.imagenFondoUrl,
          activo: planoData.activo,
        });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(getApiErrorMessage(err));
      }
    } finally {
      if (!options.signal?.aborted) {
        setCargando(false);
      }
    }
  }, [desarrolloId]);

  useEffect(() => {
    const controller = new AbortController();
    cargar({ signal: controller.signal });
    return () => controller.abort();
  }, [cargar]);

  useEffect(() => {
    if (!planoForm.svgUrl || !/^\/uploads\/.+\.svg($|\?)/i.test(planoForm.svgUrl)) {
      setSvgIds([]);
      return undefined;
    }

    const controller = new AbortController();

    fetch(resolveApiAssetUrl(planoForm.svgUrl), { signal: controller.signal })
      .then((response) => response.ok ? response.text() : '')
      .then((text) => {
        if (!text) {
          setSvgIds([]);
          return;
        }

        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        setSvgIds(
          Array.from(doc.querySelectorAll(SVG_ELEMENT_SELECTOR))
            .map((element) => element.id)
            .filter(Boolean)
        );
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setSvgIds([]);
      });

    return () => controller.abort();
  }, [planoForm.svgUrl]);

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
    setPreciosUnidad([]);
    setPreciosUnidadEditando([]);
    setPreciosUnidadPersonalizados(false);

    try {
      const [tipos, preciosModelo, preciosUnidadData] = await Promise.all([
        cargarCatalogoPrecios(),
        listarPreciosModelo(unidad.modeloId).catch(() => []),
        listarPreciosUnidad(unidad.id).catch(() => []),
      ]);

      const resumenModelo = obtenerResumenPrecios({
        precios: preciosModelo,
        fallbackPrecio: unidad.precioDesde ?? unidad.precio ?? null,
      });

      const resumenUnidad = obtenerResumenPrecios({
        precios: preciosUnidadData,
        fallbackPrecio: resumenModelo.precioDesde ?? unidad.precioDesde ?? unidad.precio ?? null,
      });

      const tiposBase = tipos.length > 0 ? tipos : resumenModelo.precios;
      const mapaModelo = new Map(
        resumenModelo.precios.map((precio) => [String(precio.tipoPrecioId || precio.tipoPrecioCodigo || precio.tipoPrecioNombre).toUpperCase(), precio])
      );
      const mapaUnidad = new Map(
        resumenUnidad.precios.map((precio) => [String(precio.tipoPrecioId || precio.tipoPrecioCodigo || precio.tipoPrecioNombre).toUpperCase(), precio])
      );
      const unidadTienePersonalizados = preciosUnidadData.length > 0;

      const catálogo = tiposBase.length > 0 ? tiposBase : resumenModelo.precios;
      const filas = (catálogo.length > 0 ? catálogo : [{
        id: 'precio-actual',
        tipoPrecioId: '',
        tipoPrecioCodigo: 'FALLBACK',
        tipoPrecioNombre: 'Precio actual',
        descripcion: '',
        precio: resumenModelo.precioDesde ?? unidad.precio ?? '',
        activo: true,
        esPrincipal: true,
        orden: 0,
      }]).map((tipo, index) => {
        const tipoKey = String(tipo.id || tipo.tipoPrecioId || tipo.codigo || tipo.nombre || index).toUpperCase();
        const precioModelo = mapaModelo.get(tipoKey) || resumenModelo.precios.find((precio) => String(precio.tipoPrecioId || precio.tipoPrecioCodigo || precio.tipoPrecioNombre).toUpperCase() === tipoKey);
        const precioUnidad = mapaUnidad.get(tipoKey) || resumenUnidad.precios.find((precio) => String(precio.tipoPrecioId || precio.tipoPrecioCodigo || precio.tipoPrecioNombre).toUpperCase() === tipoKey);
        const precioFallback = unidad.precioDesde ?? unidad.precio ?? '';
        const precioHeredado = precioModelo?.precio ?? (index === 0 ? precioFallback : '');
        const precioPersonalizado = precioUnidad?.precio ?? '';

        return {
          id: precioUnidad?.id || precioModelo?.id || `${tipoKey}-${index}`,
          tipoPrecioId: tipo.id || tipo.tipoPrecioId || '',
          tipoPrecioCodigo: tipo.codigo || tipo.tipoPrecioCodigo || '',
          tipoPrecioNombre: tipo.nombre || tipo.tipoPrecioNombre || tipo.descripcion || `Esquema ${index + 1}`,
          precioHeredado,
          precioHeredadoTexto: formatearMonedaMXN(precioHeredado),
          precioPersonalizado: precioPersonalizado === null || precioPersonalizado === undefined ? '' : String(precioPersonalizado),
          precioPersonalizadoTexto: precioPersonalizado === '' || precioPersonalizado === null || precioPersonalizado === undefined
            ? ''
            : formatearMonedaMXN(precioPersonalizado),
          descripcion: precioUnidad?.descripcion || precioModelo?.descripcion || '',
          activo: unidadTienePersonalizados ? (precioUnidad?.activo !== false) : Boolean(precioModelo || index === 0),
          orden: precioUnidad?.orden ?? precioModelo?.orden ?? index,
        };
      });

      setPreciosUnidad(preciosUnidadData);
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
    setUnidadPreciosAbierta(null);
    setPreciosUnidad([]);
    setPreciosUnidadEditando([]);
    setPreciosUnidadPersonalizados(false);
    setErrorPrecios('');
    setMensajePrecios('');
  };

  const actualizarPrecioUnidadFila = (index, cambios) => {
    setPreciosUnidadEditando((actuales) =>
      actuales.map((fila, filaIndex) => (filaIndex === index ? { ...fila, ...cambios } : fila))
    );
  };

  const personalizarPreciosUnidad = () => {
    setPreciosUnidadPersonalizados(true);
    setPreciosUnidadEditando((actuales) =>
      actuales.map((fila) => ({
        ...fila,
        precioPersonalizado: fila.precioHeredado === '' || fila.precioHeredado === null || fila.precioHeredado === undefined
          ? ''
          : String(fila.precioHeredado),
      }))
    );
  };

  const validarPreciosUnidad = () => {
    if (!preciosUnidadPersonalizados) {
      return '';
    }

    for (const fila of preciosUnidadEditando) {
      if (fila.precioPersonalizado === '' || fila.precioPersonalizado === null || fila.precioPersonalizado === undefined) {
        continue;
      }

      if (Number(fila.precioPersonalizado) < 0) {
        return `El precio personalizado de ${fila.tipoPrecioNombre} no puede ser negativo.`;
      }
    }

    return '';
  };

  const guardarPreciosUnidadEditados = async () => {
    if (!unidadPreciosAbierta?.id) {
      return;
    }

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
        await eliminarPreciosPersonalizadosUnidad(unidadPreciosAbierta.id);
        await cargar();
        await abrirPreciosUnidad(unidadActual);
        setMensajePrecios('La unidad volvió a heredar los precios del modelo.');
        return;
      }

      const payload = preciosUnidadEditando.map((fila, index) => ({
        tipoPrecioId: fila.tipoPrecioId || null,
        tipoPrecioCodigo: fila.tipoPrecioCodigo || null,
        tipoPrecioNombre: fila.tipoPrecioNombre || null,
        descripcion: fila.descripcion || null,
        precio: fila.precioPersonalizado === '' || fila.precioPersonalizado === null || fila.precioPersonalizado === undefined
          ? null
          : Number(fila.precioPersonalizado),
        activo: fila.precioPersonalizado !== '' && fila.precioPersonalizado !== null && fila.precioPersonalizado !== undefined,
        orden: fila.orden ?? index,
      }));

      await guardarPreciosUnidad(unidadPreciosAbierta.id, payload);
      await cargar();
      await abrirPreciosUnidad(unidadActual);
      setMensajePrecios('Precios personalizados guardados correctamente.');
    } catch (err) {
      setErrorPrecios(getApiErrorMessage(err));
    } finally {
      setGuardandoPrecios(false);
    }
  };

  const actualizarCampo = (event) => {
    const { checked, name, type, value } = event.target;
    setForm((actual) => ({
      ...actual,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const actualizarCampoPlano = (event) => {
    const { checked, name, type, value } = event.target;
    setPlanoForm((actual) => ({
      ...actual,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const buscarUnidades = (event) => {
    event.preventDefault();
    setBusqueda(busquedaInput);
    setPage(1);
  };

  const cambiarEstatusFiltro = (event) => {
    setEstatusFiltro(event.target.value);
    setPage(1);
  };

  const cambiarModeloFiltro = (event) => {
    setModeloFiltro(event.target.value);
    setPage(1);
  };

  const cambiarPageSize = (event) => {
    setPageSize(Number(event.target.value));
    setPage(1);
  };

  const limpiarFiltros = () => {
    setBusquedaInput('');
    setBusqueda('');
    setEstatusFiltro('');
    setModeloFiltro('');
    setPageSize(25);
    setPage(1);
  };

  const exportarIdsUnidadCsv = () => {
    const unidadesPorSvg = new Map(
      unidades
        .filter((unidad) => normalizarSvgId(unidad.svgElementId))
        .map((unidad) => [normalizarSvgId(unidad.svgElementId), unidad])
    );

    const rows = diagnosticoSvg.idsUnidadSvg.map((svgElementId) => {
      const unidad = unidadesPorSvg.get(svgElementId);
      const sugerencia = sugerirDesdeSvgElementId(svgElementId);

      return [
        svgElementId,
        sugerencia.codigoSugerido,
        sugerencia.manzanaSugerida,
        sugerencia.loteSugerido,
        unidad ? 'true' : 'false',
        unidad?.unidadId || unidad?.id || '',
        unidad?.codigoUnidad || '',
      ];
    });

    const headers = [
      'svgElementId',
      'codigoSugerido',
      'manzanaSugerida',
      'loteSugerido',
      'yaExisteEnCN',
      'unidadId',
      'codigoCN',
    ];
    const csv = [headers, ...rows].map((row) => row.map(escaparCsv).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `desarrollo-${desarrolloId}-ids-unidad-svg.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const validarSvgArchivo = (file) => {
    if (!file) return 'Selecciona un archivo SVG.';

    if (!/\.svg$/i.test(file.name || '')) {
      return 'El archivo debe tener extension .svg.';
    }

    if (file.size > MAX_SVG_SIZE) {
      return 'El archivo SVG no debe pesar mas de 5 MB.';
    }

    if (file.type && file.type !== 'image/svg+xml') {
      return 'El archivo seleccionado no parece ser un SVG valido.';
    }

    return '';
  };

  const seleccionarSvgArchivo = (event) => {
    const file = event.target.files?.[0] || null;
    setSvgArchivo(file);
    setMensajeSvg('');

    const validationError = file ? validarSvgArchivo(file) : '';
    if (validationError) {
      setError(validationError);
    } else {
      setError('');
    }
  };

  const validarCsvArchivo = (file) => {
    if (!file) return 'Selecciona un archivo CSV.';

    if (!/\.csv$/i.test(file.name || '')) {
      return 'El archivo debe tener extension .csv.';
    }

    if (file.size > MAX_CSV_SIZE) {
      return 'El archivo CSV no debe pesar mas de 10 MB.';
    }

    if (file.type && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      return 'El archivo seleccionado no parece ser un CSV valido.';
    }

    return '';
  };

  const seleccionarCsvArchivo = (event) => {
    const file = event.target.files?.[0] || null;
    setCsvArchivo(file);
    setMensajeCsv('');
    setResumenImportacion(null);

    const validationError = file ? validarCsvArchivo(file) : '';
    if (validationError) {
      setError(validationError);
    } else {
      setError('');
    }
  };

  const cancelarEdicion = () => {
    setEditandoId('');
    setForm(FORM_INICIAL);
    setError('');
  };

  const editar = (unidad) => {
    setEditandoId(unidad.id);
    setForm(buildFormFromUnidad(unidad));
    setMensaje('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validar = () => {
    if (!form.codigoUnidad.trim()) return 'El codigo de unidad es requerido.';
    if (!form.modeloId) return 'Selecciona un modelo del desarrollo.';
    if (!form.estatus) return 'Selecciona el estatus de la unidad.';
    if (!form.svgElementId.trim()) return 'El svgElementId es requerido.';
    if (Number(form.precio || 0) < 0) return 'El precio debe ser mayor o igual a 0.';
    return '';
  };

  const guardar = async (event) => {
    event.preventDefault();
    const validationError = validar();

    if (validationError) {
      setError(validationError);
      return;
    }

    setGuardando(true);
    setError('');
    setMensaje('');

    try {
      if (editandoId) {
        await actualizarUnidadAdmin(editandoId, form);
        setMensaje('Unidad actualizada correctamente.');
      } else {
        await crearUnidadAdmin(desarrolloId, form);
        setMensaje('Unidad creada correctamente.');
      }

      cancelarEdicion();
      await cargar();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  const guardarPlano = async (event) => {
    event.preventDefault();
    setGuardando(true);
    setError('');
    setMensaje('');

    try {
      await guardarPlanoAdmin(desarrolloId, planoForm);
      setMensaje('Plano interactivo guardado correctamente.');
      await cargar();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  const subirSvg = async () => {
    const validationError = validarSvgArchivo(svgArchivo);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubiendoSvg(true);
    setError('');
    setMensaje('');
    setMensajeSvg('');

    try {
      const response = await subirPlanoSvgAdmin(desarrolloId, svgArchivo);
      const url = response?.url || response?.Url || response?.data?.url || '';

      if (!url) {
        throw new Error('El API no devolvió la URL del SVG.');
      }

      setPlanoForm((actual) => ({
        ...actual,
        svgUrl: url,
        nombre: actual.nombre || 'Plano interactivo',
      }));
      setMensajeSvg('SVG subido correctamente. Revisa la URL y guarda el plano.');
      setMensaje('SVG subido correctamente.');
    } catch (err) {
      setError(err.data?.mensaje || err.data?.message || err.message || 'No fue posible subir el SVG del plano.');
    } finally {
      setSubiendoSvg(false);
    }
  };

  const importarCsv = async () => {
    const validationError = validarCsvArchivo(csvArchivo);

    if (validationError) {
      setError(validationError);
      return;
    }

    setImportandoCsv(true);
    setError('');
    setMensaje('');
    setMensajeCsv('');
    setResumenImportacion(null);

    try {
      const response = await importarUnidadesCsv(desarrolloId, csvArchivo);
      const resumen = adaptImportResumen(response);
      setResumenImportacion(resumen);
      setMensajeCsv('Importacion completada correctamente.');
      setMensaje('Unidades importadas correctamente.');
      await cargar();
    } catch (err) {
      setError(err.data?.mensaje || err.data?.message || err.message || 'No fue posible importar el CSV de unidades.');
      if (err.data) {
        setResumenImportacion(adaptImportResumen(err.data));
      }
    } finally {
      setImportandoCsv(false);
    }
  };

  const eliminar = async (unidad) => {
    if (!window.confirm(`Eliminar la unidad "${unidad.codigoUnidad}"?`)) return;

    setAccionandoId(unidad.id);
    setError('');
    setMensaje('');

    try {
      await eliminarUnidadAdmin(unidad.id);
      setMensaje('Unidad eliminada correctamente.');
      if (editandoId === unidad.id) cancelarEdicion();
      await cargar();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionandoId('');
    }
  };

  const renderPaginador = () => (
    <div className="admin-unidades-pagination">
      <span>Total {unidadesFiltradas.length} unidades</span>
      <span>Pagina {pageActual} de {totalPages}</span>
      <div>
        <button type="button" onClick={() => setPage(1)} disabled={pageActual <= 1}>Primera</button>
        <button type="button" onClick={() => setPage((actual) => Math.max(1, actual - 1))} disabled={pageActual <= 1}>Anterior</button>
        <button type="button" onClick={() => setPage((actual) => Math.min(totalPages, actual + 1))} disabled={pageActual >= totalPages}>Siguiente</button>
        <button type="button" onClick={() => setPage(totalPages)} disabled={pageActual >= totalPages}>Ultima</button>
      </div>
    </div>
  );

  return (
    <main className="admin-unidades">
      <section className="admin-unidades-hero">
        <div>
          <p className="admin-unidades-eyebrow">Administración</p>
          <h1>Unidades del desarrollo</h1>
        </div>
        <div className="admin-unidades-hero-actions">
          <Link className="admin-unidades-secondary" to={`/admin/desarrollos/${desarrolloId}/editar`}>Editar desarrollo</Link>
          <Link className="admin-unidades-secondary" to={`/admin/desarrollos/${desarrolloId}/modelos`}>Modelos</Link>
        </div>
      </section>

      {mensaje ? <p className="admin-unidades-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="admin-unidades-feedback is-error">{error}</p> : null}

      <section className="admin-unidades-card">
        <div className="admin-unidades-card-head">
          <div>
            <h2>Plano interactivo</h2>
            <p className="admin-unidades-help">El svgElementId de cada unidad debe coincidir con el id del elemento dentro del SVG.</p>
            <p className="admin-unidades-help">Ejemplo: BD svgElementId = unidad-101 / SVG &lt;polygon id="unidad-101" /&gt;</p>
          </div>
        </div>
        <form className="admin-unidades-form" onSubmit={guardarPlano}>
          <div className="admin-unidades-upload is-full">
            <label className="admin-unidades-field">
              <span>Subir archivo SVG</span>
              <input type="file" accept=".svg,image/svg+xml" onChange={seleccionarSvgArchivo} disabled={subiendoSvg || guardando} />
            </label>
            <div className="admin-unidades-upload-actions">
              <button type="button" onClick={subirSvg} disabled={subiendoSvg || guardando}>
                {subiendoSvg ? 'Subiendo...' : 'Subir SVG'}
              </button>
              {svgArchivo ? <span>{svgArchivo.name}</span> : null}
            </div>
            {mensajeSvg ? <p className="admin-unidades-upload-message">{mensajeSvg}</p> : null}
          </div>
          <Field label="Nombre del plano">
            <input name="nombre" value={planoForm.nombre} onChange={actualizarCampoPlano} placeholder="Plano maestro" />
          </Field>
          <Field label="svgUrl">
            <input name="svgUrl" value={planoForm.svgUrl} onChange={actualizarCampoPlano} placeholder="/uploads/desarrollos/1/plano.svg" />
          </Field>
          <Field label="Imagen fondo URL">
            <input name="imagenFondoUrl" value={planoForm.imagenFondoUrl} onChange={actualizarCampoPlano} placeholder="/uploads/desarrollos/1/fondo.webp" />
          </Field>
          <label className="admin-unidades-check">
            <input name="activo" type="checkbox" checked={planoForm.activo} onChange={actualizarCampoPlano} />
            <span>Plano activo</span>
          </label>
          <div className="admin-unidades-form-actions">
            <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar plano'}</button>
          </div>
        </form>

        <section className="admin-unidades-diagnostico" aria-label="Diagnostico de mapeo SVG">
          <div className="admin-unidades-diagnostico-head">
            <div>
              <h3>Diagnostico de mapeo SVG</h3>
              <p>Solo los IDs que empiezan con unidad- se comparan contra unidades vendibles. Amenidades, calles, areas verdes y etiquetas son informativas.</p>
            </div>
            <div className="admin-unidades-diagnostico-actions">
              <span className="admin-unidades-pill">{diagnosticoSvg.resumen.idsUnidadSvg} IDs unidad</span>
              <button
                type="button"
                onClick={exportarIdsUnidadCsv}
                disabled={diagnosticoSvg.idsUnidadSvg.length === 0}
              >
                Exportar IDs unidad a CSV
              </button>
            </div>
          </div>

          {!planoForm.svgUrl ? (
            <p className="admin-unidades-empty">Carga o captura un svgUrl para revisar el mapeo.</p>
          ) : null}

          {planoForm.svgUrl && svgIds.length === 0 ? (
            <p className="admin-unidades-empty">No se detectaron IDs relevantes en el SVG o no fue posible leerlo.</p>
          ) : null}

          {svgIds.length > 0 ? (
            <>
              <div className="admin-unidades-diagnostico-grid">
                <article><span>IDs unidad en SVG</span><strong>{diagnosticoSvg.resumen.idsUnidadSvg}</strong></article>
                <article><span>Unidades en CN</span><strong>{diagnosticoSvg.resumen.unidadesCn}</strong></article>
                <article className="is-ok"><span>Vinculadas</span><strong>{diagnosticoSvg.resumen.vinculadas}</strong></article>
                <article className={diagnosticoSvg.resumen.unidadesSinSvg ? 'is-warning' : 'is-ok'}><span>Sin svgElementId</span><strong>{diagnosticoSvg.resumen.unidadesSinSvg}</strong></article>
                <article className={diagnosticoSvg.resumen.svgElementIdNoEncontrados ? 'is-danger' : 'is-ok'}><span>CN no existe en SVG</span><strong>{diagnosticoSvg.resumen.svgElementIdNoEncontrados}</strong></article>
                <article className={diagnosticoSvg.resumen.idsUnidadSvgSinAsignar ? 'is-warning' : 'is-ok'}><span>SVG sin asignar</span><strong>{diagnosticoSvg.resumen.idsUnidadSvgSinAsignar}</strong></article>
                <article><span>Otros IDs informativos</span><strong>{diagnosticoSvg.resumen.idsOtrosSvg}</strong></article>
              </div>

              <div className="admin-unidades-diagnostico-details">
                <details>
                  <summary>Unidades sin svgElementId ({diagnosticoSvg.unidadesSinSvg.length})</summary>
                  {diagnosticoSvg.unidadesSinSvg.length ? (
                    <ul>{diagnosticoSvg.unidadesSinSvg.map((unidad) => <li key={unidad.id}>{unidad.codigoUnidad} - {unidad.modeloNombre || 'Sin modelo'}</li>)}</ul>
                  ) : <p>Sin pendientes.</p>}
                </details>
                <details>
                  <summary>svgElementId en CN que no existen como unidad-* en el SVG ({diagnosticoSvg.svgElementIdNoEncontrados.length})</summary>
                  {diagnosticoSvg.svgElementIdNoEncontrados.length ? (
                    <ul>{diagnosticoSvg.svgElementIdNoEncontrados.map((unidad) => <li key={unidad.id}>{unidad.codigoUnidad}: {unidad.svgElementId}</li>)}</ul>
                  ) : <p>Sin pendientes.</p>}
                </details>
                <details>
                  <summary>IDs unidad-* del SVG sin asignar ({diagnosticoSvg.idsUnidadSvgSinAsignar.length})</summary>
                  {diagnosticoSvg.idsUnidadSvgSinAsignar.length ? (
                    <ul>{diagnosticoSvg.idsUnidadSvgSinAsignar.map((id) => <li key={id}>{id}</li>)}</ul>
                  ) : <p>Sin pendientes.</p>}
                </details>
                <details>
                  <summary>Otros IDs detectados, solo informativo ({diagnosticoSvg.idsOtrosSvg.length})</summary>
                  {diagnosticoSvg.idsOtrosSvg.length ? (
                    <ul>{diagnosticoSvg.idsOtrosSvg.map((id) => <li key={id}>{id}</li>)}</ul>
                  ) : <p>No se detectaron otros IDs relevantes.</p>}
                </details>
              </div>
            </>
          ) : null}
        </section>

        <section className="admin-unidades-import" aria-label="Importar unidades desde CSV">
          <div className="admin-unidades-import-head">
            <div>
              <h3>Importar unidades desde CSV</h3>
              <p>Usa el CSV exportado desde el diagnostico, completa los datos y cargalo para crear o actualizar unidades masivamente.</p>
            </div>
          </div>
          <div className="admin-unidades-upload is-full">
            <label className="admin-unidades-field">
              <span>Archivo CSV</span>
              <input type="file" accept=".csv,text/csv" onChange={seleccionarCsvArchivo} disabled={importandoCsv} />
            </label>
            <div className="admin-unidades-upload-actions">
              <button type="button" onClick={importarCsv} disabled={importandoCsv || !csvArchivo}>
                {importandoCsv ? 'Importando...' : 'Importar'}
              </button>
              {csvArchivo ? <span>{csvArchivo.name}</span> : null}
            </div>
            {mensajeCsv ? <p className="admin-unidades-upload-message">{mensajeCsv}</p> : null}
          </div>

          {resumenImportacion ? (
            <div className="admin-unidades-import-summary">
              <article><span>Total filas</span><strong>{resumenImportacion.totalFilas}</strong></article>
              <article className="is-ok"><span>Creadas</span><strong>{resumenImportacion.creadas}</strong></article>
              <article className="is-ok"><span>Actualizadas</span><strong>{resumenImportacion.actualizadas}</strong></article>
              <article className={resumenImportacion.omitidas ? 'is-warning' : ''}><span>Omitidas</span><strong>{resumenImportacion.omitidas}</strong></article>
              <article className={resumenImportacion.errores.length ? 'is-danger' : 'is-ok'}><span>Errores</span><strong>{resumenImportacion.errores.length}</strong></article>
            </div>
          ) : null}

          {resumenImportacion?.errores?.length ? (
            <div className="admin-unidades-import-errors">
              <h4>Errores de importacion</h4>
              <div className="admin-unidades-table-wrap">
                <table className="admin-unidades-table">
                  <thead>
                    <tr>
                      <th>Fila</th>
                      <th>Codigo</th>
                      <th>svgElementId</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenImportacion.errores.map((item, index) => (
                      <tr key={`${item.fila}-${item.codigo}-${index}`}>
                        <td data-label="Fila">{item.fila}</td>
                        <td data-label="Codigo">{item.codigo || '-'}</td>
                        <td data-label="svgElementId">{item.svgElementId || '-'}</td>
                        <td data-label="Error">{item.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      </section>

      <section className="admin-unidades-card">
        <div className="admin-unidades-card-head">
          <h2>{editandoId ? 'Editar unidad' : 'Nueva unidad'}</h2>
          {editandoId ? <button type="button" onClick={cancelarEdicion}>Cancelar edicion</button> : null}
        </div>

        <form className="admin-unidades-form" onSubmit={guardar}>
          <Field label="Codigo unidad">
            <input name="codigoUnidad" value={form.codigoUnidad} onChange={actualizarCampo} placeholder="101" required />
          </Field>
          <Field label="Manzana">
            <input name="manzana" value={form.manzana} onChange={actualizarCampo} />
          </Field>
          <Field label="Lote">
            <input name="lote" value={form.lote} onChange={actualizarCampo} />
          </Field>
          <Field label="Modelo">
            <select name="modeloId" value={form.modeloId} onChange={actualizarCampo} required>
              <option value="">Selecciona modelo</option>
              {modelosActivos.map((modelo) => (
                <option key={modelo.id} value={modelo.id}>{modelo.nombre}</option>
              ))}
            </select>
          </Field>
          <Field label="Precio base / fallback">
            <input name="precio" type="number" min="0" step="0.01" value={form.precio} onChange={actualizarCampo} />
          </Field>
          <Field label="Terreno m2">
            <input name="terrenoM2" type="number" min="0" step="0.01" value={form.terrenoM2} onChange={actualizarCampo} />
          </Field>
          <Field label="Construcción m2">
            <input name="construccionM2" type="number" min="0" step="0.01" value={form.construccionM2} onChange={actualizarCampo} />
          </Field>
          <Field label="Estatus">
            <select name="estatus" value={form.estatus} onChange={actualizarCampo} required>
              {ESTATUS_UNIDAD.map((estatus) => <option key={estatus} value={estatus}>{estatus}</option>)}
            </select>
          </Field>
          <Field label="svgElementId">
            <input name="svgElementId" value={form.svgElementId} onChange={actualizarCampo} placeholder="unidad-101" required />
          </Field>
          <label className="admin-unidades-check">
            <input name="activo" type="checkbox" checked={form.activo} onChange={actualizarCampo} />
            <span>Activo</span>
          </label>
          <div className="admin-unidades-form-actions">
            <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : editandoId ? 'Guardar unidad' : 'Crear unidad'}</button>
          </div>
        </form>
      </section>

      <section className="admin-unidades-card">
        <div className="admin-unidades-card-head">
          <h2>Listado</h2>
          <span className="admin-unidades-pill">{unidadesFiltradas.length} / {unidades.length}</span>
        </div>

        {cargando ? <p className="admin-unidades-empty">Cargando unidades...</p> : null}
        {!cargando && unidades.length === 0 ? <p className="admin-unidades-empty">Este desarrollo aun no tiene unidades.</p> : null}
        {!cargando && unidades.length > 0 ? (
          <>
            <form className="admin-unidades-list-filters" onSubmit={buscarUnidades}>
              <Field label="Buscar">
                <input
                  value={busquedaInput}
                  onChange={(event) => setBusquedaInput(event.target.value)}
                  placeholder="M18, unidad-m18-15, Roble, Disponible"
                />
              </Field>
              <Field label="Estatus">
                <select value={estatusFiltro} onChange={cambiarEstatusFiltro}>
                  <option value="">Todos</option>
                  {ESTATUS_UNIDAD.map((estatus) => <option key={estatus} value={estatus}>{estatus}</option>)}
                </select>
              </Field>
              <Field label="Modelo">
                <select value={modeloFiltro} onChange={cambiarModeloFiltro}>
                  <option value="">Todos</option>
                  {modelosActivos.map((modelo) => <option key={modelo.id} value={modelo.id}>{modelo.nombre}</option>)}
                </select>
              </Field>
              <Field label="Tamano de pagina">
                <select value={pageSize} onChange={cambiarPageSize}>
                  {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </Field>
              <div className="admin-unidades-filter-actions">
                <button type="submit">Buscar</button>
                <button type="button" onClick={limpiarFiltros}>Limpiar filtros</button>
              </div>
            </form>

            {unidadesFiltradas.length === 0 ? (
              <p className="admin-unidades-empty">No hay unidades que coincidan con los filtros.</p>
            ) : renderPaginador()}
          </>
        ) : null}

        {!cargando && unidadesPagina.length > 0 ? (
          <div className="admin-unidades-table-wrap">
            <table className="admin-unidades-table">
              <thead>
                <tr>
                  <th>Unidad</th>
                  <th>Manzana</th>
                  <th>Lote</th>
                  <th>Modelo</th>
                  <th>Precio</th>
                  <th>Origen</th>
                  <th>Terreno</th>
                  <th>Construcción</th>
                  <th>Estatus</th>
                  <th>SVG</th>
                  <th>Activo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {unidadesPagina.map((unidad) => (
                  <tr key={unidad.id}>
                    <td data-label="Unidad"><strong>{unidad.codigoUnidad}</strong></td>
                    <td data-label="Manzana">{unidad.manzana || '-'}</td>
                    <td data-label="Lote">{unidad.lote || '-'}</td>
                    <td data-label="Modelo">{unidad.modeloNombre}</td>
                    <td data-label="Precio">
                      <strong>{unidad.precioDesdeTexto || unidad.precioTexto}</strong>
                    </td>
                    <td data-label="Origen">
                      {unidad.precioOrigenEtiqueta ? <span className={`admin-unidades-pill ${unidad.precioOrigen === 'PERSONALIZADO' ? 'is-ok' : unidad.precioOrigen === 'MODELO' ? '' : 'is-off'}`}>{unidad.precioOrigenEtiqueta}</span> : '-'}
                    </td>
                    <td data-label="Terreno">{unidad.terrenoM2 ? `${unidad.terrenoM2} m2` : '-'}</td>
                    <td data-label="Construcción">{unidad.construccionM2 ? `${unidad.construccionM2} m2` : '-'}</td>
                    <td data-label="Estatus"><span className={`admin-unidades-status is-${unidad.estatus.toLowerCase()}`}>{unidad.estatus}</span></td>
                    <td data-label="SVG">
                      <span>{unidad.svgElementId || '-'}</span>
                      {svgIds.length > 0 && (!normalizarSvgId(unidad.svgElementId) || !diagnosticoSvg.idsUnidadSvg.includes(normalizarSvgId(unidad.svgElementId))) ? (
                        <small className="admin-unidades-warning">Sin figura SVG vinculada</small>
                      ) : null}
                    </td>
                    <td data-label="Activo"><span className={`admin-unidades-pill ${unidad.activo ? 'is-ok' : 'is-off'}`}>{unidad.activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td data-label="Acciones">
                      <div className="admin-unidades-actions">
                        <button type="button" onClick={() => editar(unidad)} disabled={accionandoId === unidad.id}>Editar</button>
                        <button type="button" onClick={() => abrirPreciosUnidad(unidad)} disabled={guardandoPrecios}>
                          Precios
                        </button>
                        <button type="button" className="is-danger" onClick={() => eliminar(unidad)} disabled={accionandoId === unidad.id}>
                          {accionandoId === unidad.id ? 'Eliminando...' : 'Eliminar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!cargando && unidadesFiltradas.length > 0 ? renderPaginador() : null}
      </section>

      {unidadPreciosAbierta ? (
        <div className="admin-unidades-modal-overlay" role="presentation" onMouseDown={cerrarPreciosUnidad}>
          <section className="admin-unidades-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-unidades-modal-head">
              <div>
                <p className="admin-unidades-eyebrow">Precios de unidad</p>
                <h2>{unidadPreciosAbierta.codigoUnidad}</h2>
                <span>{unidadPreciosAbierta.modeloNombre}</span>
              </div>
              <button type="button" onClick={cerrarPreciosUnidad} aria-label="Cerrar" disabled={guardandoPrecios}>x</button>
            </div>

            <div className="admin-unidades-modal-summary">
              <article>
                <span>Origen actual</span>
                <strong>{preciosUnidadPersonalizados ? 'Personalizado' : 'Modelo'}</strong>
              </article>
              <article>
                <span>Precio efectivo</span>
                <strong>{unidadPreciosAbierta.precioDesdeTexto || unidadPreciosAbierta.precioTexto || formatearMonedaMXN(unidadPreciosAbierta.precio)}</strong>
              </article>
            </div>

            {cargandoPrecios ? <p className="admin-unidades-empty">Cargando precios...</p> : null}
            {errorPrecios ? <p className="admin-unidades-feedback is-error">{errorPrecios}</p> : null}
            {mensajePrecios ? <p className="admin-unidades-feedback is-ok">{mensajePrecios}</p> : null}

            {!cargandoPrecios && preciosUnidadEditando.length === 0 ? (
              <p className="admin-unidades-empty">No se pudieron cargar esquemas de precio para esta unidad.</p>
            ) : null}

            {!cargandoPrecios && preciosUnidadEditando.length > 0 ? (
              <div className="admin-unidades-prices-table-wrap">
                <table className="admin-unidades-prices-table">
                  <thead>
                    <tr>
                      <th>Esquema</th>
                      <th>Precio heredado</th>
                      <th>Precio personalizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preciosUnidadEditando.map((fila, index) => (
                      <tr key={fila.id || `${unidadPreciosAbierta.id}-precio-${index}`}>
                        <td data-label="Esquema">
                          <strong>{fila.tipoPrecioNombre}</strong>
                          {fila.tipoPrecioCodigo ? <small>{fila.tipoPrecioCodigo}</small> : null}
                        </td>
                        <td data-label="Precio heredado">
                          <strong>{fila.precioHeredadoTexto || formatearMonedaMXN(fila.precioHeredado)}</strong>
                        </td>
                        <td data-label="Precio personalizado">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={fila.precioPersonalizado}
                            onChange={(event) => actualizarPrecioUnidadFila(index, { precioPersonalizado: event.target.value })}
                            disabled={!preciosUnidadPersonalizados}
                            placeholder={preciosUnidadPersonalizados ? '0' : ''}
                          />
                          <small>
                            {preciosUnidadPersonalizados
                              ? (fila.precioPersonalizado !== '' ? fila.precioPersonalizadoTexto || formatearMonedaMXN(fila.precioPersonalizado) : 'Captura un precio para activar el esquema.')
                              : 'Heredado del modelo'}
                          </small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className="admin-unidades-modal-actions">
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
                  await guardarPreciosUnidadEditados();
                }}
                disabled={cargandoPrecios || guardandoPrecios}
              >
                Volver a heredar precios del modelo
              </button>
              <button type="button" onClick={cerrarPreciosUnidad} disabled={cargandoPrecios || guardandoPrecios}>
                Cerrar
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
