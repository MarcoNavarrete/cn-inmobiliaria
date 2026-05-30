import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { resolveApiAssetUrl } from '../../services/apiClient';
import { obtenerPlano, guardarPlano, subirPlanoSvg } from '../../services/proyectoPlanoService';
import { listarUnidades } from '../../services/proyectoUnidadesService';
import { obtenerProyecto } from '../../services/proyectosInmobiliariosService';
import usePermisosEmpresa from '../../hooks/usePermisosEmpresa';
import './AdminProyectoPlanoPage.css';

const FORM_INICIAL = {
  nombre: 'Plano general',
  svgUrl: '',
  imagenFondoUrl: '',
  descripcion: '',
};
const MAX_SVG_SIZE = 10 * 1024 * 1024;

const ESTATUS_LABELS = {
  DISPONIBLE: 'Disponible',
  APARTADO: 'Apartado',
  EN_PROCESO: 'En proceso',
  VENDIDO: 'Vendido',
  LIQUIDADO: 'Liquidado',
  BLOQUEADO: 'Bloqueado',
  NO_DISPONIBLE: 'No disponible',
};

const ESTATUS_COLORES = {
  DISPONIBLE: { fill: 'rgba(34, 197, 94, 0.56)', stroke: '#15803d' },
  APARTADO: { fill: 'rgba(250, 204, 21, 0.62)', stroke: '#a16207' },
  EN_PROCESO: { fill: 'rgba(59, 130, 246, 0.48)', stroke: '#1d4ed8' },
  VENDIDO: { fill: 'rgba(239, 68, 68, 0.52)', stroke: '#b91c1c' },
  LIQUIDADO: { fill: 'rgba(20, 184, 166, 0.52)', stroke: '#0f766e' },
  BLOQUEADO: { fill: 'rgba(156, 163, 175, 0.58)', stroke: '#4b5563' },
  NO_DISPONIBLE: { fill: 'rgba(75, 85, 99, 0.62)', stroke: '#1f2937' },
};

const SCRIPT_PROTOCOL = ['java', 'script:'].join('');
const SVG_TAGS_DETECTABLES = new Set(['path', 'polygon', 'rect', 'circle', 'ellipse', 'g', 'polyline', 'line']);
const SVG_TAGS_EXCLUIDOS = new Set([
  'svg',
  'defs',
  'clippath',
  'mask',
  'pattern',
  'lineargradient',
  'radialgradient',
  'style',
  'metadata',
  'title',
  'desc',
]);
const MAX_DIAGNOSTICO_ROWS = 200;
const SVG_UNIDAD_PREFIXES = [
  'unidad-',
  'lote-',
  'casa-',
  'depto-',
  'departamento-',
  'local-',
  'oficina-',
  'macrolote-',
];
const CSV_COLUMNS = [
  'unidadId',
  'codigo',
  'tipoUnidad',
  'nombre',
  'manzana',
  'lote',
  'torre',
  'nivel',
  'numeroInterior',
  'modeloId',
  'superficieTerrenoM2',
  'superficieConstrucciónM2',
  'precioM2',
  'precioTotal',
  'estatus',
  'svgElementId',
  'colorHex',
  'destacado',
  'visiblePublico',
  'observaciones',
  'accion',
];

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible procesar la accion.';

const normalizeStatus = (status) =>
  String(status || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

const getStatusClass = (status) => `is-${normalizeStatus(status).toLowerCase()}`;

const getStatusLabel = (status) => ESTATUS_LABELS[normalizeStatus(status)] || String(status || 'Sin estatus');

const sanitizeSvg = (svgText) =>
  String(svgText || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(new RegExp(`\\s(?:href|xlink:href)\\s*=\\s*(['"])\\s*${SCRIPT_PROTOCOL}[\\s\\S]*?\\1`, 'gi'), '');

const sanitizeSvgDom = (svg) => {
  svg.querySelectorAll('script, foreignObject, iframe, object, embed').forEach((element) => {
    element.remove();
  });

  svg.querySelectorAll('*').forEach((element) => {
    [...element.attributes].forEach((attr) => {
      const nombre = attr.name.toLowerCase();
      const valor = String(attr.value || '').trim().toLowerCase();
      if (nombre.startsWith('on') || ((nombre === 'href' || nombre === 'xlink:href') && valor.startsWith(SCRIPT_PROTOCOL))) {
        element.removeAttribute(attr.name);
      }
    });
  });
};

const escapeCssId = (value) => {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }

  return String(value).replace(/([ #;?%&,.+*~':"!^$[\]()=>|/@])/g, '\\$1');
};

const mapPlanoToForm = (plano) => ({
  nombre: plano?.nombre || 'Plano general',
  svgUrl: plano?.svgUrl || '',
  imagenFondoUrl: plano?.imagenFondoUrl || '',
  descripcion: plano?.descripcion || '',
});

const buildPayload = (form) => ({
  nombre: form.nombre.trim(),
  svgUrl: form.svgUrl.trim() || null,
  imagenFondoUrl: form.imagenFondoUrl.trim() || null,
  descripcion: form.descripcion.trim() || null,
});

const formatCurrency = (value) => {
  if (!value || Number.isNaN(Number(value))) return '-';

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const formatArea = (value) => {
  if (!value || Number.isNaN(Number(value))) return '-';
  return `${Number(value).toLocaleString('es-MX')} m2`;
};

const getUnidadModelo = (unidad) => unidad?.modeloNombre || unidad?.modelo || '-';

const getUnidadId = (unidad) => unidad?.unidadId || unidad?.id || '';

const normalizeSvgElementId = (value) => String(value || '').trim();

const esSvgIdUnidadProbable = (svgElementId) => {
  const normalized = normalizeSvgElementId(svgElementId).toLowerCase();
  return SVG_UNIDAD_PREFIXES.some((prefix) => normalized.startsWith(prefix));
};

const generarCodigoDesdeSvgElementId = (svgElementId) => {
  const normalized = normalizeSvgElementId(svgElementId);
  const withoutUnidadPrefix = normalized.replace(/^unidad-/i, '');
  const code = withoutUnidadPrefix
    .trim()
    .replace(/_/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase();

  return code || normalized.toUpperCase();
};

const getTipoUnidadDefault = (tipoProyecto) => {
  switch (String(tipoProyecto || '').toUpperCase()) {
    case 'DESARROLLO_CASAS':
      return 'CASA';
    case 'DESARROLLO_VERTICAL':
      return 'DEPARTAMENTO';
    case 'LOTEO':
    case 'MIXTO':
    default:
      return 'LOTE';
  }
};

const escapeCsvValue = (value) => {
  if (value === undefined || value === null) return '';
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const descargarArchivoCsv = (filename, rows) => {
  const contenido = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${contenido}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export default function AdminProyectoPlanoPage() {
  const permisosEmpresa = usePermisosEmpresa();
  const { esAdminCn } = permisosEmpresa;
  const puedeSubirPlano = permisosEmpresa.puedeSubirPlano;
  const { proyectoId } = useParams();
  const planoRef = useRef(null);
  const [proyecto, setProyecto] = useState(null);
  const [plano, setPlano] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [archivoSvg, setArchivoSvg] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [svgLoading, setSvgLoading] = useState(false);
  const [svgMarkup, setSvgMarkup] = useState('');
  const [svgError, setSvgError] = useState('');
  const [unidadSeleccionada, setUnidadSeleccionada] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const svgPreviewUrl = useMemo(() => resolveApiAssetUrl(form.svgUrl), [form.svgUrl]);
  const unidadesConSvg = useMemo(() => unidades.filter((unidad) => normalizeSvgElementId(unidad.svgElementId)), [unidades]);
  const unidadesSinSvg = useMemo(() => unidades.filter((unidad) => !normalizeSvgElementId(unidad.svgElementId)), [unidades]);
  const unidadesPorSvgId = useMemo(
    () => Object.fromEntries(unidadesConSvg.map((unidad) => [normalizeSvgElementId(unidad.svgElementId), unidad])),
    [unidadesConSvg]
  );
  const svgElementIdDuplicados = useMemo(() => {
    const conteo = unidadesConSvg.reduce((acc, unidad) => {
      acc[unidad.svgElementId] = (acc[unidad.svgElementId] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(conteo)
      .filter(([, total]) => total > 1)
      .map(([svgElementId, total]) => ({ svgElementId, total }));
  }, [unidadesConSvg]);

  const cargarDatos = useCallback(async (options = {}) => {
    setCargando(true);
    setError('');

    try {
      const [proyectoData, planoData, unidadesData] = await Promise.all([
        obtenerProyecto(proyectoId, { signal: options.signal }),
        obtenerPlano(proyectoId, { signal: options.signal }).catch((err) => {
          if (err.status === 404) return null;
          throw err;
        }),
        listarUnidades(proyectoId, { soloActivas: true, signal: options.signal }),
      ]);

      setProyecto(proyectoData);
      setPlano(planoData);
      setForm(mapPlanoToForm(planoData));
      setUnidades(unidadesData);
      setUnidadSeleccionada((actual) => {
        if (!actual) return null;
        return unidadesData.find((unidad) => unidad.id === actual.id) || null;
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(getApiErrorMessage(err));
      }
    } finally {
      if (!options.signal?.aborted) {
        setCargando(false);
      }
    }
  }, [proyectoId]);

  useEffect(() => {
    const controller = new AbortController();
    cargarDatos({ signal: controller.signal });
    return () => controller.abort();
  }, [cargarDatos]);

  useEffect(() => {
    if (!svgPreviewUrl) {
      setSvgMarkup('');
      setSvgError('');
      setSvgLoading(false);
      setTooltip(null);
      setUnidadSeleccionada(null);
      return undefined;
    }

    const controller = new AbortController();
    setSvgLoading(true);
    setSvgError('');
    setSvgMarkup('');
    setTooltip(null);

    const cargarSvg = async () => {
      try {
        const response = await fetch(svgPreviewUrl, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`No fue posible descargar el SVG (${response.status}).`);
        }

        const text = await response.text();
        const limpio = sanitizeSvg(text);
        if (!limpio || !limpio.includes('<svg')) {
          throw new Error('El archivo configurado no parece ser un SVG valido.');
        }

        setSvgMarkup(limpio);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setSvgError(err.message || 'No fue posible cargar el SVG interactivo.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setSvgLoading(false);
        }
      }
    };

    cargarSvg();

    return () => controller.abort();
  }, [svgPreviewUrl]);

  const svgInteractivo = useMemo(() => {
    if (!svgMarkup) {
      return {
        markup: '',
        unidadesMapeadas: [],
        unidadesNoEncontradas: unidadesConSvg,
      };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
    const svg = doc.querySelector('svg');

    if (!svg) {
      return {
        markup: '',
        unidadesMapeadas: [],
        unidadesNoEncontradas: unidadesConSvg,
      };
    }

    sanitizeSvgDom(svg);

    const clasesSvg = new Set(String(svg.getAttribute('class') || '').split(/\s+/).filter(Boolean));
    clasesSvg.add('admin-proyecto-plano-svg-root');
    svg.setAttribute('class', [...clasesSvg].join(' '));

    svg.querySelectorAll('text').forEach((textElement) => {
      textElement.setAttribute('pointer-events', 'none');
    });

    const unidadesMapeadas = [];
    const unidadesNoEncontradas = [];

    unidadesConSvg.forEach((unidad) => {
      const svgElementId = normalizeSvgElementId(unidad.svgElementId);
      const selectedSvgElementId = normalizeSvgElementId(unidadSeleccionada?.svgElementId);
      const element = svg.querySelector(`#${escapeCssId(svgElementId)}`);
      if (!element) {
        unidadesNoEncontradas.push(unidad);
        return;
      }

      const estatus = normalizeStatus(unidad.estatus);
      const colores = ESTATUS_COLORES[estatus] || ESTATUS_COLORES.NO_DISPONIBLE;
      const clases = new Set(String(element.getAttribute('class') || '').split(/\s+/).filter(Boolean));
      clases.add('admin-plano-unit');
      clases.add(getStatusClass(estatus));

      if (selectedSvgElementId === svgElementId) {
        clases.add('is-selected');
      }

      element.setAttribute('class', [...clases].join(' '));
      element.setAttribute('data-svg-element-id', svgElementId);
      element.setAttribute('data-unidad-id', unidad.id || unidad.unidadId || svgElementId);
      element.setAttribute('data-estatus', estatus);
      element.setAttribute('data-codigo', unidad.codigo || '');
      element.setAttribute('role', 'button');
      element.setAttribute('tabindex', '0');
      element.style.fill = colores.fill;
      element.style.stroke = colores.stroke;
      element.style.strokeWidth = selectedSvgElementId === svgElementId ? '4' : '2';
      element.style.cursor = 'pointer';
      element.style.transition = 'fill 0.16s ease, stroke 0.16s ease, stroke-width 0.16s ease, opacity 0.16s ease';
      unidadesMapeadas.push(unidad);
    });

    return {
      markup: sanitizeSvg(svg.outerHTML),
      unidadesMapeadas,
      unidadesNoEncontradas,
    };
  }, [svgMarkup, unidadSeleccionada?.svgElementId, unidadesConSvg]);

  const svgIdsDetectados = useMemo(() => {
    if (!svgMarkup) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return [];

    const idsVisitados = new Set();

    return [...svg.querySelectorAll('[id]')]
      .map((element) => {
        const tagName = element.tagName.toLowerCase();
        const svgElementId = normalizeSvgElementId(element.getAttribute('id'));

        if (!svgElementId || idsVisitados.has(svgElementId)) return null;
        idsVisitados.add(svgElementId);

        if (SVG_TAGS_EXCLUIDOS.has(tagName) || !SVG_TAGS_DETECTABLES.has(tagName)) {
          return null;
        }

        const unidad = unidadesPorSvgId[svgElementId] || null;
        const esUnidadProbable = esSvgIdUnidadProbable(svgElementId);

        return {
          id: svgElementId,
          svgElementId,
          tagName,
          esUnidadProbable,
          yaTieneUnidad: Boolean(unidad),
          unidadId: unidad ? getUnidadId(unidad) : null,
          codigoUnidad: unidad?.codigo || unidad?.nombre || null,
          estatus: unidad?.estatus || null,
          unidad,
        };
      })
      .filter(Boolean);
  }, [svgMarkup, unidadesPorSvgId]);

  const diagnosticoSvg = useMemo(() => {
    const idsUnidadSvg = svgIdsDetectados.filter((item) => item.esUnidadProbable);
    const otrosIdsInformativos = svgIdsDetectados.filter((item) => !item.esUnidadProbable);
    const idsUnidadSvgSet = new Set(idsUnidadSvg.map((item) => item.svgElementId));
    const unidadesConSvgElementId = unidades.filter((unidad) => normalizeSvgElementId(unidad.svgElementId));
    const unidadesSvgElementIdSet = new Set(unidadesConSvgElementId.map((unidad) => normalizeSvgElementId(unidad.svgElementId)));
    const vinculadas = unidades.filter((unidad) => {
      const svgElementId = normalizeSvgElementId(unidad.svgElementId);
      return svgElementId && idsUnidadSvgSet.has(svgElementId);
    });
    const sinSvgElementId = unidades.filter((unidad) => !normalizeSvgElementId(unidad.svgElementId));
    const cnNoExisteEnSvg = unidadesConSvgElementId.filter((unidad) => !idsUnidadSvgSet.has(normalizeSvgElementId(unidad.svgElementId)));
    const svgUnidadSinAsignar = idsUnidadSvg.filter((item) => !unidadesSvgElementIdSet.has(item.svgElementId));

    return {
      idsUnidadSvg,
      unidadesCn: unidades,
      vinculadas,
      sinSvgElementId,
      cnNoExisteEnSvg,
      svgUnidadSinAsignar,
      otrosIdsInformativos,
    };
  }, [svgIdsDetectados, unidades]);

  const filasCsvDesdeSvg = useMemo(() => {
    const tipoUnidadDefault = getTipoUnidadDefault(proyecto?.tipoProyecto);

    return diagnosticoSvg.idsUnidadSvg.map((item) => {
      const unidad = item.unidad;
      const codigoSugerido = generarCodigoDesdeSvgElementId(item.svgElementId);

      if (unidad) {
        return {
          unidadId: getUnidadId(unidad),
          codigo: unidad.codigo || codigoSugerido,
          tipoUnidad: unidad.tipoUnidad || tipoUnidadDefault,
          nombre: unidad.nombre || '',
          manzana: unidad.manzana || '',
          lote: unidad.lote || '',
          torre: unidad.torre || '',
          nivel: unidad.nivel || '',
          numeroInterior: unidad.numeroInterior || '',
          modeloId: unidad.modeloId || '',
          superficieTerrenoM2: unidad.superficieTerrenoM2 || '',
          superficieConstrucciónM2: unidad.superficieConstrucciónM2 || '',
          precioM2: unidad.precioM2 || '',
          precioTotal: unidad.precioTotal || '',
          estatus: unidad.estatus || 'DISPONIBLE',
          svgElementId: item.svgElementId,
          colorHex: unidad.colorHex || '',
          destacado: Boolean(unidad.destacado),
          visiblePublico: unidad.visiblePublico !== false,
          observaciones: unidad.observaciones || '',
          accion: 'UPSERT',
        };
      }

      return {
        unidadId: '',
        codigo: codigoSugerido,
        tipoUnidad: tipoUnidadDefault,
        nombre: codigoSugerido,
        manzana: '',
        lote: '',
        torre: '',
        nivel: '',
        numeroInterior: '',
        modeloId: '',
        superficieTerrenoM2: '',
        superficieConstrucciónM2: '',
        precioM2: '',
        precioTotal: '',
        estatus: 'DISPONIBLE',
        svgElementId: item.svgElementId,
        colorHex: '',
        destacado: false,
        visiblePublico: true,
        observaciones: '',
        accion: 'UPSERT',
      };
    });
  }, [diagnosticoSvg.idsUnidadSvg, proyecto?.tipoProyecto]);

  const actualizarCampo = (event) => {
    const { name, value } = event.target;
    setForm((actual) => ({ ...actual, [name]: value }));
  };

  const seleccionarArchivoSvg = (file) => {
    setError('');
    setMensaje('');
    setArchivoSvg(null);

    if (!file) return;

    const extension = String(file.name || '').split('.').pop().toLowerCase();
    if (extension !== 'svg') {
      setError('Selecciona un archivo SVG valido.');
      return;
    }

    if (file.size > MAX_SVG_SIZE) {
      setError('El archivo SVG no debe pesar mas de 10MB.');
      return;
    }

    setArchivoSvg(file);
  };

  const subirSvg = async (event) => {
    event.preventDefault();
    setError('');
    setMensaje('');

    if (!Number(proyectoId)) {
      setError('Proyecto invalido.');
      return;
    }

    if (!form.nombre.trim()) {
      setError('El nombre del plano es requerido.');
      return;
    }

    if (!archivoSvg) {
      setError('Selecciona un archivo SVG para subir.');
      return;
    }

    setGuardando(true);

    try {
      const planoSubido = await subirPlanoSvg(proyectoId, {
        file: archivoSvg,
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
      });
      setArchivoSvg(null);
      setMensaje('SVG del plano subido correctamente.');
      if (planoSubido) {
        setPlano(planoSubido);
        setForm(mapPlanoToForm(planoSubido));
      }
      await cargarDatos();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  const guardar = async (event) => {
    event.preventDefault();
    setError('');
    setMensaje('');

    if (!Number(proyectoId)) {
      setError('Proyecto invalido.');
      return;
    }

    if (!form.nombre.trim()) {
      setError('El nombre del plano es requerido.');
      return;
    }

    setGuardando(true);

    try {
      await guardarPlano(proyectoId, buildPayload(form));
      setMensaje(form.svgUrl.trim()
        ? 'Plano guardado correctamente.'
        : 'Plano guardado correctamente. Aun no se ha configurado un SVG para el plano interactivo.'
      );
      await cargarDatos();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setGuardando(false);
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

  const descargarCsvDesdeSvg = () => {
    setError('');
    setMensaje('');

    if (!form.svgUrl.trim()) {
      setError('Primero sube o configura el SVG del plano.');
      return;
    }

    if (svgError || !svgMarkup) {
      setError(svgError || 'El SVG aun no esta cargado.');
      return;
    }

    if (filasCsvDesdeSvg.length === 0) {
      setError('No se detectaron IDs de unidad en el SVG. Para que un elemento sea considerado unidad vendible, su id debe iniciar con unidad-.');
      return;
    }

    const rows = [
      CSV_COLUMNS,
      ...filasCsvDesdeSvg.map((fila) => CSV_COLUMNS.map((column) => fila[column])),
    ];
    const filename = proyecto?.slug
      ? `${proyecto.slug}-ids-unidad.csv`
      : `proyecto-${proyectoId}-ids-unidad.csv`;

    descargarArchivoCsv(filename, rows);
    setMensaje('CSV generado desde los IDs unidad del SVG.');
  };

  const getUnidadFromEvent = (event) => {
    const element = event.target?.closest?.('[data-svg-element-id]');
    if (!element) return null;
    return unidadesPorSvgId[element.getAttribute('data-svg-element-id')] || null;
  };

  const mostrarTooltip = (event) => {
    const unidad = getUnidadFromEvent(event);
    if (!unidad || !planoRef.current) {
      setTooltip(null);
      return;
    }

    const bounds = planoRef.current.getBoundingClientRect();
    setTooltip({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      unidad,
    });
  };

  const seleccionarDesdePlano = (event) => {
    const unidad = getUnidadFromEvent(event);
    if (unidad) {
      setUnidadSeleccionada(unidad);
    }
  };

  const seleccionarConTeclado = (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    const unidad = getUnidadFromEvent(event);
    if (unidad) {
      event.preventDefault();
      setUnidadSeleccionada(unidad);
    }
  };

  const seleccionarUnidad = (unidad) => {
    setUnidadSeleccionada(unidad);
    if (planoRef.current && svgInteractivo.unidadesMapeadas.some((item) => item.id === unidad.id)) {
      planoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const renderDetalleUnidad = () => {
    if (!unidadSeleccionada) {
      return (
        <p className="admin-proyecto-plano-empty">
          Selecciona una unidad en el plano para ver sus detalles.
        </p>
      );
    }

    return (
      <div className="admin-proyecto-plano-detail">
        <div className="admin-proyecto-plano-detail-head">
          <div>
            <p className="admin-proyecto-plano-eyebrow">Unidad seleccionada</p>
            <h3>{unidadSeleccionada.codigo || unidadSeleccionada.nombre || 'Unidad'}</h3>
          </div>
          <button type="button" onClick={() => setUnidadSeleccionada(null)}>Limpiar</button>
        </div>
        <dl>
          <div><dt>Tipo</dt><dd>{unidadSeleccionada.tipoUnidad || '-'}</dd></div>
          <div><dt>Modelo</dt><dd>{getUnidadModelo(unidadSeleccionada)}</dd></div>
          <div><dt>Manzana</dt><dd>{unidadSeleccionada.manzana || '-'}</dd></div>
          <div><dt>Lote</dt><dd>{unidadSeleccionada.lote || '-'}</dd></div>
          <div><dt>Torre</dt><dd>{unidadSeleccionada.torre || '-'}</dd></div>
          <div><dt>Nivel</dt><dd>{unidadSeleccionada.nivel || '-'}</dd></div>
          <div><dt>Numero interior</dt><dd>{unidadSeleccionada.numeroInterior || '-'}</dd></div>
          <div><dt>Superficie terreno</dt><dd>{formatArea(unidadSeleccionada.superficieTerrenoM2)}</dd></div>
          <div><dt>Superficie construccion</dt><dd>{formatArea(unidadSeleccionada.superficieConstrucciónM2)}</dd></div>
          <div><dt>Precio total</dt><dd>{formatCurrency(unidadSeleccionada.precioTotal)}</dd></div>
          <div><dt>Estatus</dt><dd>{getStatusLabel(unidadSeleccionada.estatus)}</dd></div>
          <div><dt>SvgElementId</dt><dd>{unidadSeleccionada.svgElementId || '-'}</dd></div>
        </dl>
        <div className="admin-proyecto-plano-actions">
          <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/unidades`}>Editar unidad</Link>
          {unidadSeleccionada.svgElementId ? (
            <button type="button" onClick={() => copiarSvgElementId(unidadSeleccionada.svgElementId)}>Copiar svgElementId</button>
          ) : null}
        </div>
      </div>
    );
  };

  const renderUnidades = (items, titulo) => (
    <div className="admin-proyecto-plano-unidades-group">
      <h3>{titulo}</h3>
      {items.length === 0 ? (
        <p className="admin-proyecto-plano-empty">Sin unidades en este grupo.</p>
      ) : (
        <div className="admin-proyecto-plano-table-wrap">
          <table className="admin-proyecto-plano-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Tipo</th>
                <th>Manzana</th>
                <th>Lote</th>
                <th>Modelo</th>
                <th>Estatus</th>
                <th>SvgElementId</th>
                <th>Publico</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((unidad) => (
                <tr
                  key={unidad.id}
                  className={unidadSeleccionada?.id === unidad.id ? 'is-selected-row' : ''}
                >
                  <td><strong>{unidad.codigo}</strong></td>
                  <td>{unidad.tipoUnidad}</td>
                  <td>{unidad.manzana || '-'}</td>
                  <td>{unidad.lote || '-'}</td>
                  <td>{getUnidadModelo(unidad)}</td>
                  <td><span className={`admin-proyecto-plano-status ${getStatusClass(unidad.estatus)}`}>{getStatusLabel(unidad.estatus)}</span></td>
                  <td>{unidad.svgElementId || '-'}</td>
                  <td>{unidad.visiblePublico ? 'Si' : 'No'}</td>
                  <td>{unidad.activo ? 'Activo' : 'Inactivo'}</td>
                  <td>
                    <div className="admin-proyecto-plano-actions">
                      <button type="button" onClick={() => seleccionarUnidad(unidad)}>Seleccionar</button>
                      <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/unidades`}>Editar unidad</Link>
                      {unidad.svgElementId ? (
                        <button type="button" onClick={() => copiarSvgElementId(unidad.svgElementId)}>Copiar</button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (cargando) {
    return (
      <main className="admin-proyecto-plano">
        <p className="admin-proyecto-plano-feedback">Cargando plano...</p>
      </main>
    );
  }

  return (
    <main className="admin-proyecto-plano">
      <section className="admin-proyecto-plano-hero">
        <div>
          <p className="admin-proyecto-plano-eyebrow">Plano interactivo</p>
          <h1>{proyecto?.nombre || 'Proyecto inmobiliario'}</h1>
          <span>{proyecto?.tipoProyecto} - {proyecto?.empresaNombre}</span>
        </div>
        <div className="admin-proyecto-plano-hero-actions">
          <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/editar`}>Editar proyecto</Link>
          <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/unidades`}>Unidades</Link>
          <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/modelos`}>Modelos</Link>
          <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/imagenes`}>Imágenes</Link>
          <Link to={`/admin/proyectos-inmobiliarios/prospectos?proyectoId=${proyectoId}`}>Prospectos</Link>
          <Link to={`/admin/proyectos-inmobiliarios/apartados?proyectoId=${proyectoId}`}>Apartados</Link>
          <Link to="/admin/proyectos-inmobiliarios">Volver al listado</Link>
        </div>
      </section>

      {mensaje ? <p className="admin-proyecto-plano-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="admin-proyecto-plano-feedback is-error">{error}</p> : null}

      <section className="admin-proyecto-plano-grid">
        {puedeSubirPlano ? (
        <form className="admin-proyecto-plano-card" onSubmit={subirSvg}>
          <h2>Plano interactivo</h2>
          <p className="admin-proyecto-plano-intro">
            Sube el archivo SVG del plano. Los elementos del SVG deben tener IDs para poder vincularlos con unidades.
            Para unidades vendibles, recomendamos que los IDs del SVG comiencen con unidad-.
          </p>
          {!plano ? <p className="admin-proyecto-plano-empty">Este proyecto aun no tiene plano configurado.</p> : null}
          <label>
            <span>Nombre</span>
            <input name="nombre" value={form.nombre} onChange={actualizarCampo} required />
          </label>
          <label>
            <span>Descripción</span>
            <textarea name="descripcion" value={form.descripcion} onChange={actualizarCampo} rows="4" />
          </label>
          <div className="admin-proyecto-plano-upload">
            <label>
              <span>Archivo SVG</span>
              <input
                type="file"
                accept=".svg,image/svg+xml"
                onChange={(event) => {
                  seleccionarArchivoSvg(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
              <small>Solo archivos .svg. Tamaño máximo 10MB.</small>
            </label>
            <div className="admin-proyecto-plano-file-preview">
              {archivoSvg ? (
                <>
                  <strong>{archivoSvg.name}</strong>
                  <span>{(archivoSvg.size / 1024 / 1024).toFixed(2)} MB</span>
                </>
              ) : (
                <span>Sin archivo seleccionado</span>
              )}
            </div>
          </div>
          <p className="admin-proyecto-plano-warning">El SVG sera publico y no debe contener información sensible, datos privados ni documentos internos.</p>
          <button type="submit" disabled={guardando}>{guardando ? 'Subiendo...' : 'Subir SVG del plano'}</button>

          {esAdminCn ? (
            <details className="admin-proyecto-plano-advanced">
              <summary>Configuracion tecnica avanzada</summary>
              <p className="admin-proyecto-plano-tech-note">
                Permite guardar manualmente una URL publica del SVG. Uso recomendado solo para soporte tecnico.
              </p>
              <label>
                <span>SvgUrl</span>
                <input name="svgUrl" value={form.svgUrl} onChange={actualizarCampo} placeholder="/uploads/proyectos/1/plano.svg" />
                <small>URL publica del archivo SVG del plano. Usar solo si ya existe un archivo publicado.</small>
              </label>
              <label>
                <span>ImagenFondoUrl</span>
                <input name="imagenFondoUrl" value={form.imagenFondoUrl} onChange={actualizarCampo} />
                <small>Imagen de fondo opcional si se requiere.</small>
              </label>
              {!form.svgUrl.trim() ? (
                <p className="admin-proyecto-plano-warning">Aun no se ha configurado un SVG para el plano interactivo.</p>
              ) : null}
              <button type="button" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar URL manual'}</button>
            </details>
          ) : null}
        </form>
        ) : (
          <section className="admin-proyecto-plano-card">
            <h2>Configuracion del plano</h2>
            <p className="admin-proyecto-plano-empty">Tu usuario tiene permisos de consulta. No puedes subir SVG, editar URLs ni modificar la configuracion del plano.</p>
          </section>
        )}

        <section className="admin-proyecto-plano-card">
          <div className="admin-proyecto-plano-section-head">
            <div>
              <h2>Diagnostico de mapeo SVG</h2>
              <p>Solo los IDs que parecen representar unidades se comparan contra unidades vendibles. Amenidades, calles, areas verdes y etiquetas son informativas.</p>
            </div>
          </div>
          {svgMarkup && !svgError ? (
            <div className="admin-proyecto-plano-svg-ids">
              <div className="admin-proyecto-plano-stats is-diagnostico">
                <div className="is-info"><span>IDs unidad en SVG</span><strong>{diagnosticoSvg.idsUnidadSvg.length}</strong></div>
                <div className="is-info"><span>Unidades en CN</span><strong>{diagnosticoSvg.unidadesCn.length}</strong></div>
                <div className="is-ok"><span>Vinculadas</span><strong>{diagnosticoSvg.vinculadas.length}</strong></div>
                <div className={diagnosticoSvg.sinSvgElementId.length ? 'is-warning' : 'is-ok'}><span>Sin svgElementId</span><strong>{diagnosticoSvg.sinSvgElementId.length}</strong></div>
                <div className={diagnosticoSvg.cnNoExisteEnSvg.length ? 'is-danger' : 'is-ok'}><span>CN no existe en SVG</span><strong>{diagnosticoSvg.cnNoExisteEnSvg.length}</strong></div>
                <div className={diagnosticoSvg.svgUnidadSinAsignar.length ? 'is-warning' : 'is-ok'}><span>SVG sin asignar</span><strong>{diagnosticoSvg.svgUnidadSinAsignar.length}</strong></div>
                <div className="is-muted"><span>Otros IDs informativos</span><strong>{diagnosticoSvg.otrosIdsInformativos.length}</strong></div>
              </div>
            <div className="admin-proyecto-plano-svg-actions">
              {puedeSubirPlano ? (
                <>
                  <button
                    type="button"
                    onClick={descargarCsvDesdeSvg}
                    disabled={!form.svgUrl.trim() || svgLoading || Boolean(svgError) || diagnosticoSvg.idsUnidadSvg.length === 0}
                  >
                    Exportar IDs unidad a CSV
                  </button>
                  <Link
                    to={`/admin/proyectos-inmobiliarios/${proyectoId}/unidades`}
                    state={{ abrirImportCsv: true }}
                  >
                    Ir a importar CSV
                  </Link>
                </>
              ) : null}
            </div>
            <p className="admin-proyecto-plano-empty">
              Este CSV se genera desde los IDs del SVG. Completalo en Excel y subelo desde la pantalla de Unidades para crear o actualizar unidades masivamente.
              Para que un elemento sea considerado unidad vendible, su id debe iniciar con unidad-.
            </p>
            {!form.svgUrl.trim() ? (
              <p className="admin-proyecto-plano-empty">Primero sube o configura el SVG del plano.</p>
            ) : svgError ? (
              <p className="admin-proyecto-plano-feedback is-error">{svgError}</p>
            ) : svgMarkup && svgIdsDetectados.length === 0 ? (
              <p className="admin-proyecto-plano-empty">No se detectaron elementos con id en el SVG. Revisa el archivo en Inkscape y asigna IDs a los lotes/unidades.</p>
            ) : null}
              <details className="admin-proyecto-plano-svg-list">
                <summary>Unidades sin svgElementId ({diagnosticoSvg.sinSvgElementId.length})</summary>
                {diagnosticoSvg.sinSvgElementId.length > MAX_DIAGNOSTICO_ROWS ? <p className="admin-proyecto-plano-note">Mostrando los primeros {MAX_DIAGNOSTICO_ROWS} registros.</p> : null}
                <div className="admin-proyecto-plano-table-wrap">
                  <table className="admin-proyecto-plano-table is-svg-ids">
                    <thead><tr><th>unidadId</th><th>Codigo</th><th>Tipo</th><th>Estatus</th></tr></thead>
                    <tbody>
                      {diagnosticoSvg.sinSvgElementId.slice(0, MAX_DIAGNOSTICO_ROWS).map((unidad) => (
                        <tr key={getUnidadId(unidad)}>
                          <td>{getUnidadId(unidad)}</td>
                          <td><strong>{unidad.codigo || '-'}</strong></td>
                          <td>{unidad.tipoUnidad || '-'}</td>
                          <td>{getStatusLabel(unidad.estatus)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              <details className="admin-proyecto-plano-svg-list">
                <summary>svgElementId en CN que no existen como unidad-* en el SVG ({diagnosticoSvg.cnNoExisteEnSvg.length})</summary>
                {diagnosticoSvg.cnNoExisteEnSvg.length > MAX_DIAGNOSTICO_ROWS ? <p className="admin-proyecto-plano-note">Mostrando los primeros {MAX_DIAGNOSTICO_ROWS} registros.</p> : null}
                <div className="admin-proyecto-plano-table-wrap">
                  <table className="admin-proyecto-plano-table is-svg-ids">
                    <thead><tr><th>unidadId</th><th>Codigo</th><th>svgElementId</th><th>Estatus</th></tr></thead>
                    <tbody>
                      {diagnosticoSvg.cnNoExisteEnSvg.slice(0, MAX_DIAGNOSTICO_ROWS).map((unidad) => (
                        <tr key={getUnidadId(unidad)}>
                          <td>{getUnidadId(unidad)}</td>
                          <td><strong>{unidad.codigo || '-'}</strong></td>
                          <td>{unidad.svgElementId || '-'}</td>
                          <td>{getStatusLabel(unidad.estatus)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              <details className="admin-proyecto-plano-svg-list">
                <summary>IDs unidad-* del SVG sin asignar ({diagnosticoSvg.svgUnidadSinAsignar.length})</summary>
                {diagnosticoSvg.svgUnidadSinAsignar.length > MAX_DIAGNOSTICO_ROWS ? <p className="admin-proyecto-plano-note">Mostrando los primeros {MAX_DIAGNOSTICO_ROWS} registros.</p> : null}
                <div className="admin-proyecto-plano-table-wrap">
                  <table className="admin-proyecto-plano-table is-svg-ids">
                    <thead><tr><th>svgElementId</th><th>Tipo elemento</th><th>Codigo sugerido</th></tr></thead>
                    <tbody>
                      {diagnosticoSvg.svgUnidadSinAsignar.slice(0, MAX_DIAGNOSTICO_ROWS).map((item) => (
                        <tr key={item.svgElementId}>
                          <td><strong>{item.svgElementId}</strong></td>
                          <td>{item.tagName}</td>
                          <td>{generarCodigoDesdeSvgElementId(item.svgElementId)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              <details className="admin-proyecto-plano-svg-list">
                <summary>Otros IDs detectados, solo informativo ({diagnosticoSvg.otrosIdsInformativos.length})</summary>
                {diagnosticoSvg.otrosIdsInformativos.length > MAX_DIAGNOSTICO_ROWS ? <p className="admin-proyecto-plano-note">Mostrando los primeros {MAX_DIAGNOSTICO_ROWS} registros.</p> : null}
                <div className="admin-proyecto-plano-table-wrap">
                  <table className="admin-proyecto-plano-table is-svg-ids">
                    <thead><tr><th>ID</th><th>Tipo elemento</th></tr></thead>
                    <tbody>
                      {diagnosticoSvg.otrosIdsInformativos.slice(0, MAX_DIAGNOSTICO_ROWS).map((item) => (
                        <tr key={item.svgElementId}>
                          <td><strong>{item.svgElementId}</strong></td>
                          <td>{item.tagName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          ) : (
            <p className="admin-proyecto-plano-empty">Sube o configura un SVG valido para ver el diagnostico de mapeo.</p>
          )}
          {!form.svgUrl.trim() ? (
            <p className="admin-proyecto-plano-empty">Primero configura el SVG del plano para iniciar el mapeo interactivo.</p>
          ) : unidades.length === 0 ? (
            <p className="admin-proyecto-plano-empty">Este proyecto aun no tiene unidades registradas.</p>
          ) : unidadesConSvg.length === 0 ? (
            <p className="admin-proyecto-plano-empty">Las unidades aun no tienen svgElementId. Capturalos desde la pantalla de unidades para vincularlas al SVG.</p>
          ) : svgError ? (
            <p className="admin-proyecto-plano-feedback is-error">{svgError}</p>
          ) : null}
          {svgInteractivo.unidadesNoEncontradas.length ? (
            <details className="admin-proyecto-plano-issues" open>
              <summary>Unidades con svgElementId no encontrado ({svgInteractivo.unidadesNoEncontradas.length})</summary>
              <ul>
                {svgInteractivo.unidadesNoEncontradas.map((unidad) => (
                  <li key={unidad.id}>{unidad.codigo || unidad.nombre}: {unidad.svgElementId}</li>
                ))}
              </ul>
            </details>
          ) : null}
          {svgElementIdDuplicados.length ? (
            <details className="admin-proyecto-plano-issues" open>
              <summary>svgElementId repetidos ({svgElementIdDuplicados.length})</summary>
              <ul>
                {svgElementIdDuplicados.map((item) => (
                  <li key={item.svgElementId}>{item.svgElementId}: {item.total} unidades</li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      </section>

      <section className="admin-proyecto-plano-card">
        <div className="admin-proyecto-plano-section-head">
          <div>
            <h2>Vista previa del plano</h2>
            <p>Las unidades mapeadas usan el svgElementId capturado en administracion de unidades.</p>
          </div>
        </div>
        <div className="admin-proyecto-plano-legend">
          {Object.keys(ESTATUS_LABELS).map((estatus) => (
            <span key={estatus} className={getStatusClass(estatus)}>
              <i />
              {ESTATUS_LABELS[estatus]}
            </span>
          ))}
        </div>
        {form.svgUrl.trim() ? (
          <div className="admin-proyecto-plano-preview-layout">
            <div className="admin-proyecto-plano-preview" ref={planoRef}>
              {svgLoading ? <p className="admin-proyecto-plano-state">Cargando SVG interactivo...</p> : null}
              {!svgLoading && svgInteractivo.markup ? (
                <div
                  className="admin-proyecto-plano-stage"
                  onMouseMove={mostrarTooltip}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={seleccionarDesdePlano}
                  onKeyDown={seleccionarConTeclado}
                >
                  <div
                    className="admin-proyecto-plano-svg-inline"
                    dangerouslySetInnerHTML={{ __html: svgInteractivo.markup }}
                  />
                  {tooltip ? (
                    <div
                      className="admin-proyecto-plano-tooltip"
                      style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}
                    >
                      <strong>{tooltip.unidad.codigo || tooltip.unidad.nombre}</strong>
                      <span>{getStatusLabel(tooltip.unidad.estatus)}</span>
                      <span>{tooltip.unidad.svgElementId}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {!svgLoading && (!svgInteractivo.markup || svgError) ? (
                <>
                  {svgError ? <p className="admin-proyecto-plano-state is-error">{svgError}</p> : null}
                  <object type="image/svg+xml" data={svgPreviewUrl} aria-label="Vista previa del plano">
                    <p>No fue posible cargar la vista previa del SVG.</p>
                  </object>
                </>
              ) : null}
            </div>
            <aside className="admin-proyecto-plano-detail-card">
              {renderDetalleUnidad()}
            </aside>
          </div>
        ) : (
          <p className="admin-proyecto-plano-empty">Primero configura la URL del SVG del plano.</p>
        )}
      </section>

      <section className="admin-proyecto-plano-card">
        <div className="admin-proyecto-plano-section-head">
          <h2>Unidades y svgElementId</h2>
          <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/unidades`}>Administrar unidades</Link>
        </div>
        {unidades.length === 0 ? (
          <p className="admin-proyecto-plano-empty">Este proyecto aun no tiene unidades registradas.</p>
        ) : (
          <>
            {renderUnidades(unidadesConSvg, 'Unidades con svgElementId')}
            {renderUnidades(unidadesSinSvg, 'Unidades sin svgElementId')}
          </>
        )}
      </section>
    </main>
  );
}
