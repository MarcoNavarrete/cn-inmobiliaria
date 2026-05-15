import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import usePermisosEmpresa from '../../hooks/usePermisosEmpresa';
import { resolveApiAssetUrl } from '../../services/apiClient';
import { listarEmpresas } from '../../services/empresasInmobiliariasService';
import {
  actualizarProyecto,
  crearProyecto,
  obtenerProyecto,
  subirImagenPrincipal,
  subirLogoProyecto,
} from '../../services/proyectosInmobiliariosService';
import './AdminProyectoInmobiliarioFormPage.css';

const FORM_INICIAL = {
  empresaId: '',
  empresaNombre: '',
  tipoProyecto: 'LOTEO',
  nombre: '',
  slug: '',
  resumen: '',
  descripcion: '',
  ubicacionTexto: '',
  direccion: '',
  estadoId: '',
  poblacionId: '',
  localidadId: '',
  latitud: '',
  longitud: '',
  precioDesde: '',
  superficieDesdeM2: '',
  superficieHastaM2: '',
  totalUnidades: '',
  imagenPrincipalUrl: '',
  logoUrl: '',
  usarLogoEmpresa: true,
  nombreContacto: '',
  telefonoContacto: '',
  whatsappContacto: '',
  correoContacto: '',
  estatusPublicacion: 'BORRADOR',
  mostrarEnPublico: false,
  activo: true,
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

const EXTENSIONES_PERMITIDAS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible guardar el proyecto.';

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

const pickProyectoId = (value) =>
  value?.proyectoId || value?.id || value?.Id || value?.data?.proyectoId || value?.data?.id || '';

const getExtension = (file) => String(file?.name || '').split('.').pop().toLowerCase();

const revokePreviewUrl = (value) => {
  if (typeof value === 'string' && value.startsWith('blob:')) {
    URL.revokeObjectURL(value);
  }
};

const validarArchivoImagen = (file, etiqueta) => {
  if (!file) return '';

  const extension = getExtension(file);
  if (!EXTENSIONES_PERMITIDAS.includes(extension)) {
    return `${etiqueta} debe ser JPG, JPEG, PNG o WEBP.`;
  }

  if (file.size > MAX_FILE_SIZE) {
    return `${etiqueta} no debe pesar mas de 10MB.`;
  }

  return '';
};

const normalizarEmpresaSesion = (empresa = {}) => {
  const id = toInputValue(empresa.id || empresa.empresaId || empresa.idEmpresa);

  return {
    id,
    empresaId: id,
    nombre: empresa.nombre || empresa.razonSocial || empresa.nombreEmpresa || 'Sin nombre',
    razonSocial: empresa.razonSocial || '',
    rolEmpresa: String(empresa.rolEmpresa || empresa.rol || empresa.rolUsuario || empresa.tipoRol || '').toUpperCase(),
    activo: empresa.activo !== false && empresa.esActivo !== false,
  };
};

const mapProyectoToForm = (proyecto = {}) => ({
  empresaId: toInputValue(proyecto.empresaId || proyecto.empresa?.id || proyecto.empresa?.empresaId),
  empresaNombre: proyecto.empresaNombre || proyecto.empresa?.nombre || proyecto.empresa?.razonSocial || '',
  tipoProyecto: proyecto.tipoProyecto || 'LOTEO',
  nombre: proyecto.nombre || '',
  slug: proyecto.slug || '',
  resumen: proyecto.resumen || '',
  descripcion: proyecto.descripcion || '',
  ubicacionTexto: proyecto.ubicacionTexto || proyecto.ubicacion || '',
  direccion: proyecto.direccion || '',
  estadoId: toInputValue(proyecto.estadoId),
  poblacionId: toInputValue(proyecto.poblacionId),
  localidadId: toInputValue(proyecto.localidadId),
  latitud: toInputValue(proyecto.latitud),
  longitud: toInputValue(proyecto.longitud),
  precioDesde: toInputValue(proyecto.precioDesde),
  superficieDesdeM2: toInputValue(proyecto.superficieDesdeM2),
  superficieHastaM2: toInputValue(proyecto.superficieHastaM2),
  totalUnidades: toInputValue(proyecto.totalUnidades),
  imagenPrincipalUrl: proyecto.imagenPrincipalUrl || '',
  logoUrl: proyecto.logoUrl || '',
  usarLogoEmpresa: proyecto.usarLogoEmpresa !== false,
  nombreContacto: proyecto.nombreContacto || '',
  telefonoContacto: proyecto.telefonoContacto || '',
  whatsappContacto: proyecto.whatsappContacto || '',
  correoContacto: proyecto.correoContacto || '',
  estatusPublicacion: proyecto.estatusPublicacion || 'BORRADOR',
  mostrarEnPublico: proyecto.mostrarEnPublico === true,
  activo: proyecto.activo !== false,
});

const buildPayload = (form) => ({
  empresaId: toNumberOrNull(form.empresaId),
  tipoProyecto: form.tipoProyecto,
  nombre: form.nombre.trim(),
  slug: form.slug.trim(),
  resumen: form.resumen.trim() || null,
  descripcion: form.descripcion.trim() || null,
  ubicacionTexto: form.ubicacionTexto.trim() || null,
  direccion: form.direccion.trim() || null,
  estadoId: form.estadoId.trim() || null,
  poblacionId: form.poblacionId.trim() || null,
  localidadId: form.localidadId.trim() || null,
  latitud: toNumberOrNull(form.latitud),
  longitud: toNumberOrNull(form.longitud),
  precioDesde: toNumberOrNull(form.precioDesde),
  superficieDesdeM2: toNumberOrNull(form.superficieDesdeM2),
  superficieHastaM2: toNumberOrNull(form.superficieHastaM2),
  totalUnidades: toNumberOrNull(form.totalUnidades),
  imagenPrincipalUrl: form.imagenPrincipalUrl.trim() || null,
  logoUrl: form.logoUrl.trim() || null,
  usarLogoEmpresa: form.usarLogoEmpresa === true,
  nombreContacto: form.nombreContacto.trim() || null,
  telefonoContacto: form.telefonoContacto.trim() || null,
  whatsappContacto: form.whatsappContacto.trim() || null,
  correoContacto: form.correoContacto.trim() || null,
  estatusPublicacion: form.estatusPublicacion,
  mostrarEnPublico: form.mostrarEnPublico === true,
  activo: form.activo !== false,
});

export default function AdminProyectoInmobiliarioFormPage() {
  const { proyectoId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const esEdicion = Boolean(proyectoId);
  const permisosEmpresa = usePermisosEmpresa();
  const { cargando: cargandoSesion, esAdminCn, puedeEditarProyecto, empresas: empresasSesion } = permisosEmpresa;
  const [empresasCatalogo, setEmpresasCatalogo] = useState([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [imagenPrincipalFile, setImagenPrincipalFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [imagenPrincipalPreview, setImagenPrincipalPreview] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [cargandoProyecto, setCargandoProyecto] = useState(true);
  const [cargandoEmpresas, setCargandoEmpresas] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [permisoDenegado, setPermisoDenegado] = useState('');

  const empresasSesionNormalizadas = useMemo(
    () => (Array.isArray(empresasSesion) ? empresasSesion : []).map(normalizarEmpresaSesion).filter((empresa) => empresa.id),
    [empresasSesion]
  );

  const empresasSesionAdministrables = useMemo(
    () => empresasSesionNormalizadas.filter((empresa) => empresa.activo && empresa.rolEmpresa === 'ADMIN_EMPRESA'),
    [empresasSesionNormalizadas]
  );

  const empresasDisponibles = esAdminCn ? empresasCatalogo : empresasSesionAdministrables;
  const puedeCrearProyecto = esAdminCn || empresasSesionAdministrables.length > 0;
  const puedeCambiarEmpresa = esAdminCn || (!esEdicion && empresasDisponibles.length > 1);
  const empresasOpciones = useMemo(() => {
    if (!esAdminCn || !form.empresaId) {
      return empresasDisponibles;
    }

    if (empresasDisponibles.some((empresa) => String(empresa.id) === String(form.empresaId))) {
      return empresasDisponibles;
    }

    return [
      {
        id: form.empresaId,
        nombre: form.empresaNombre || `Empresa ${form.empresaId}`,
      },
      ...empresasDisponibles,
    ];
  }, [esAdminCn, empresasDisponibles, form.empresaId, form.empresaNombre]);

  const empresaSeleccionada = useMemo(
    () => empresasDisponibles.find((empresa) => String(empresa.id) === String(form.empresaId)) || null,
    [empresasDisponibles, form.empresaId]
  );
  const empresaVisible = empresaSeleccionada || (esEdicion ? { nombre: form.empresaNombre || 'Sin empresa' } : null);
  const imagenPrincipalPreviewUrl = imagenPrincipalPreview || resolveApiAssetUrl(form.imagenPrincipalUrl);
  const logoPreviewUrl = logoPreview || resolveApiAssetUrl(form.logoUrl);

  const limpiarPreview = React.useCallback((setter) => {
    setter((actual) => {
      revokePreviewUrl(actual);
      return '';
    });
  }, []);

  const limpiarArchivosSeleccionados = React.useCallback(() => {
    setImagenPrincipalFile(null);
    setLogoFile(null);
    limpiarPreview(setImagenPrincipalPreview);
    limpiarPreview(setLogoPreview);
  }, [limpiarPreview]);

  const prepararArchivo = (file, etiqueta, setFile, setPreview) => {
    limpiarPreview(setPreview);

    if (!file) {
      setFile(null);
      return;
    }

    const errorArchivo = validarArchivoImagen(file, etiqueta);
    if (errorArchivo) {
      setFile(null);
      setError(errorArchivo);
      return;
    }

    setError('');
    setFile(file);
    setPreview(URL.createObjectURL(file));
  };

  useEffect(() => () => {
    if (imagenPrincipalPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagenPrincipalPreview);
    }
    if (logoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }
  }, [imagenPrincipalPreview, logoPreview]);

  useEffect(() => {
    if (cargandoSesion) {
      return undefined;
    }

    const controller = new AbortController();

    const cargarDatos = async () => {
      setCargandoProyecto(true);
      setCargandoEmpresas(false);
      setError('');
      setMensaje('');
      setPermisoDenegado('');
      limpiarArchivosSeleccionados();

      try {
        let catalogo = [];

        if (esAdminCn) {
          setCargandoEmpresas(true);
          catalogo = await listarEmpresas({ soloActivas: true, signal: controller.signal });
          if (!controller.signal.aborted) {
            setEmpresasCatalogo(catalogo);
          }
        } else {
          setEmpresasCatalogo([]);
        }

        const empresasBase = esAdminCn ? catalogo : empresasSesionAdministrables;

        if (!esEdicion) {
          if (!puedeCrearProyecto || empresasBase.length === 0) {
            setPermisoDenegado('No tienes permiso para crear proyectos.');
            setForm(FORM_INICIAL);
            return;
          }

          const empresaInicial = empresasBase[0];
          setForm({
            ...FORM_INICIAL,
            empresaId: empresaInicial?.id || '',
            empresaNombre: empresaInicial?.nombre || empresaInicial?.razonSocial || '',
          });
          return;
        }

        if (!puedeEditarProyecto) {
          setPermisoDenegado('No tienes permiso para editar este proyecto.');
          setForm(FORM_INICIAL);
          return;
        }

        const proyecto = await obtenerProyecto(proyectoId, { signal: controller.signal });
        const proyectoEmpresaId = toInputValue(proyecto.empresaId || proyecto.empresa?.id || proyecto.empresa?.empresaId);

        if (!esAdminCn && empresasBase.length > 0) {
          const tieneAccesoAEmpresa = empresasBase.some((empresa) => String(empresa.id) === String(proyectoEmpresaId));
          if (!tieneAccesoAEmpresa) {
            setPermisoDenegado('No tienes permiso para editar este proyecto.');
            setForm(FORM_INICIAL);
            return;
          }
        }

        setForm({
          ...mapProyectoToForm(proyecto),
          empresaId: proyectoEmpresaId,
          empresaNombre: proyecto.empresaNombre || proyecto.empresa?.nombre || proyecto.empresa?.razonSocial || '',
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          if (err.status === 403) {
            setPermisoDenegado(esEdicion ? 'No tienes permiso para editar este proyecto.' : 'No tienes permiso para crear proyectos.');
          } else {
            setError(getApiErrorMessage(err));
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargandoProyecto(false);
          setCargandoEmpresas(false);
        }
      }
    };

    cargarDatos();

    return () => controller.abort();
  }, [
    cargandoSesion,
    limpiarArchivosSeleccionados,
    esAdminCn,
    esEdicion,
    empresasSesionAdministrables,
    puedeCrearProyecto,
    puedeEditarProyecto,
    proyectoId,
  ]);

  useEffect(() => {
    const state = location.state || {};

    if (state.mensaje) {
      setMensaje(state.mensaje);
    }

    if (state.error) {
      setError(state.error);
    }

    if (state.mensaje || state.error) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.state, navigate]);

  const actualizarCampo = (event) => {
    const { checked, name, type, value } = event.target;

    setForm((actual) => {
      const siguiente = {
        ...actual,
        [name]: type === 'checkbox' ? checked : value,
      };

      if (name === 'empresaId') {
        const empresa = empresasDisponibles.find((item) => String(item.id) === String(value));
        siguiente.empresaNombre = empresa?.nombre || empresa?.razonSocial || '';
      }

      return siguiente;
    });
  };

  const generarSlugDesdeNombre = () => {
    setForm((actual) => ({
      ...actual,
      slug: generarSlug(actual.nombre),
    }));
  };

  const subirArchivosSiExisten = async (proyectoGuardadoId) => {
    let proyectoActualizado = null;

    if (imagenPrincipalFile) {
      proyectoActualizado = await subirImagenPrincipal(proyectoGuardadoId, imagenPrincipalFile);
    }

    if (logoFile) {
      proyectoActualizado = await subirLogoProyecto(proyectoGuardadoId, logoFile) || proyectoActualizado;
    }

    return proyectoActualizado;
  };

  const validar = () => {
    if (!esEdicion && !puedeCrearProyecto) {
      return 'No tienes permiso para crear proyectos.';
    }

    if (esEdicion && !puedeEditarProyecto) {
      return 'No tienes permiso para editar este proyecto.';
    }

    if (!Number(form.empresaId)) return 'Selecciona una empresa inmobiliaria.';
    if (!form.tipoProyecto) return 'Selecciona el tipo de proyecto.';
    if (!form.nombre.trim()) return 'El nombre es requerido.';
    if (!form.slug.trim()) return 'El slug es requerido.';

    const numericosNoNegativos = [
      ['precioDesde', 'Precio desde'],
      ['superficieDesdeM2', 'Superficie desde'],
      ['superficieHastaM2', 'Superficie hasta'],
      ['totalUnidades', 'Total unidades'],
    ];

    for (const [key, label] of numericosNoNegativos) {
      if (form[key] !== '' && Number(form[key]) < 0) {
        return `${label} no puede ser negativo.`;
      }
    }

    for (const key of ['latitud', 'longitud']) {
      if (form[key] !== '' && Number.isNaN(Number(form[key]))) {
        return `${key === 'latitud' ? 'Latitud' : 'Longitud'} debe ser numerica.`;
      }
    }

    return '';
  };

  const guardar = async (event) => {
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
      const payload = buildPayload(form);
      let proyectoGuardadoId = proyectoId;

      if (esEdicion) {
        await actualizarProyecto(proyectoId, payload);
        proyectoGuardadoId = proyectoId;
      } else {
        const response = await crearProyecto(payload);
        proyectoGuardadoId = pickProyectoId(response);
      }

      if (!proyectoGuardadoId) {
        throw new Error('No fue posible identificar el proyecto guardado.');
      }

      if (imagenPrincipalFile || logoFile) {
        await subirArchivosSiExisten(proyectoGuardadoId);
      }

      if (esEdicion) {
        const proyectoActualizado = await obtenerProyecto(proyectoGuardadoId);
        setForm({
          ...mapProyectoToForm(proyectoActualizado),
          empresaId: toInputValue(proyectoActualizado.empresaId || proyectoActualizado.empresa?.id || proyectoActualizado.empresa?.empresaId),
          empresaNombre: proyectoActualizado.empresaNombre || proyectoActualizado.empresa?.nombre || proyectoActualizado.empresa?.razonSocial || '',
        });
        limpiarArchivosSeleccionados();
        setMensaje('Proyecto actualizado correctamente.');
      } else {
        navigate(`/admin/proyectos-inmobiliarios/${proyectoGuardadoId}/editar`, {
          replace: true,
          state: { mensaje: 'Proyecto creado correctamente.' },
        });
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  if (cargandoSesion || cargandoProyecto || (esAdminCn && cargandoEmpresas)) {
    return (
      <main className="admin-proyecto-form">
        <p className="admin-proyecto-form-feedback">Cargando proyecto...</p>
      </main>
    );
  }

  if (permisoDenegado) {
    return (
      <main className="admin-proyecto-form">
        <section className="admin-proyecto-form-hero">
          <div>
            <p className="admin-proyecto-form-eyebrow">Proyectos inmobiliarios</p>
            <h1>{esEdicion ? 'Editar proyecto' : 'Nuevo proyecto'}</h1>
          </div>
          <Link className="admin-proyecto-form-secondary" to="/admin/proyectos-inmobiliarios">
            Volver al listado
          </Link>
        </section>
        <p className="admin-proyecto-form-feedback is-error">{permisoDenegado}</p>
      </main>
    );
  }

  return (
    <main className="admin-proyecto-form">
      <section className="admin-proyecto-form-hero">
        <div>
          <p className="admin-proyecto-form-eyebrow">Proyectos inmobiliarios</p>
          <h1>{esEdicion ? 'Editar proyecto' : 'Nuevo proyecto'}</h1>
        </div>
        <Link className="admin-proyecto-form-secondary" to="/admin/proyectos-inmobiliarios">
          Volver al listado
        </Link>
      </section>

      {mensaje ? <p className="admin-proyecto-form-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="admin-proyecto-form-feedback is-error">{error}</p> : null}

      <form onSubmit={guardar}>
        <section className="admin-proyecto-form-card">
          <h2>Datos principales</h2>
          <div className="admin-proyecto-form-grid">
            <label className={puedeCambiarEmpresa ? '' : 'is-full'}>
              <span>Empresa inmobiliaria</span>
              {puedeCambiarEmpresa ? (
                <select name="empresaId" value={form.empresaId} onChange={actualizarCampo} required>
                  <option value="">Selecciona empresa</option>
                  {empresasOpciones.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>
                  ))}
                </select>
              ) : (
                <div className="admin-proyecto-form-readonly">
                  <strong>{empresaVisible?.nombre || 'Empresa asignada'}</strong>
                  <span>{esEdicion ? 'No puedes cambiar la empresa de este proyecto.' : 'Empresa asignada a tu cuenta.'}</span>
                </div>
              )}
            </label>
            <label>
              <span>Tipo de proyecto</span>
              <select name="tipoProyecto" value={form.tipoProyecto} onChange={actualizarCampo} required>
                {TIPOS_PROYECTO.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
              </select>
            </label>
            <label>
              <span>Nombre</span>
              <input name="nombre" value={form.nombre} onChange={actualizarCampo} required />
            </label>
            <label>
              <span>Slug</span>
              <div className="admin-proyecto-form-inline">
                <input name="slug" value={form.slug} onChange={actualizarCampo} required />
                <button type="button" onClick={generarSlugDesdeNombre}>Generar</button>
              </div>
            </label>
            <label className="is-full">
              <span>Resumen</span>
              <input name="resumen" value={form.resumen} onChange={actualizarCampo} />
            </label>
            <label className="is-full">
              <span>Descripcion</span>
              <textarea name="descripcion" value={form.descripcion} onChange={actualizarCampo} rows="5" />
            </label>
          </div>
        </section>

        <section className="admin-proyecto-form-card">
          <h2>Ubicacion</h2>
          <div className="admin-proyecto-form-grid">
            <label className="is-full">
              <span>Ubicacion texto</span>
              <input name="ubicacionTexto" value={form.ubicacionTexto} onChange={actualizarCampo} />
            </label>
            <label className="is-full">
              <span>Direccion</span>
              <input name="direccion" value={form.direccion} onChange={actualizarCampo} />
            </label>
            <label><span>EstadoId</span><input name="estadoId" value={form.estadoId} onChange={actualizarCampo} /></label>
            <label><span>PoblacionId</span><input name="poblacionId" value={form.poblacionId} onChange={actualizarCampo} /></label>
            <label><span>LocalidadId</span><input name="localidadId" value={form.localidadId} onChange={actualizarCampo} /></label>
            <label><span>Latitud</span><input name="latitud" value={form.latitud} onChange={actualizarCampo} /></label>
            <label><span>Longitud</span><input name="longitud" value={form.longitud} onChange={actualizarCampo} /></label>
          </div>
        </section>

        <section className="admin-proyecto-form-card">
          <h2>Informacion comercial</h2>
          <div className="admin-proyecto-form-grid">
            <label><span>Precio desde</span><input name="precioDesde" type="number" min="0" step="0.01" value={form.precioDesde} onChange={actualizarCampo} /></label>
            <label><span>Superficie desde m2</span><input name="superficieDesdeM2" type="number" min="0" step="0.01" value={form.superficieDesdeM2} onChange={actualizarCampo} /></label>
            <label><span>Superficie hasta m2</span><input name="superficieHastaM2" type="number" min="0" step="0.01" value={form.superficieHastaM2} onChange={actualizarCampo} /></label>
            <label><span>Total unidades</span><input name="totalUnidades" type="number" min="0" step="1" value={form.totalUnidades} onChange={actualizarCampo} /></label>
            {puedeEditarProyecto ? (
              <div className="admin-proyecto-form-media-grid is-full">
                <section className="admin-proyecto-form-media-card">
                  <div className="admin-proyecto-form-media-head">
                    <div>
                      <span>Imagen principal</span>
                      <p>Imagen publica que se mostrara como portada del proyecto.</p>
                    </div>
                  </div>
                  <div className="admin-proyecto-form-media-preview">
                    {imagenPrincipalPreviewUrl ? (
                      <img src={imagenPrincipalPreviewUrl} alt="Vista previa de imagen principal" />
                    ) : (
                      <span>Sin imagen principal</span>
                    )}
                  </div>
                  <label className="admin-proyecto-form-file">
                    <span>Seleccionar archivo</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      onChange={(event) => {
                        prepararArchivo(event.target.files?.[0], 'La imagen principal', setImagenPrincipalFile, setImagenPrincipalPreview);
                        event.target.value = '';
                      }}
                    />
                    <small>JPG, JPEG, PNG o WEBP. Tamano maximo 10MB.</small>
                  </label>
                  {form.imagenPrincipalUrl ? (
                    <p className="admin-proyecto-form-media-current">URL actual: {form.imagenPrincipalUrl}</p>
                  ) : null}
                  {imagenPrincipalFile ? (
                    <p className="admin-proyecto-form-media-current">Archivo seleccionado: {imagenPrincipalFile.name}</p>
                  ) : null}
                </section>

                <section className="admin-proyecto-form-media-card">
                  <div className="admin-proyecto-form-media-head">
                    <div>
                      <span>Logo del proyecto</span>
                      <p>Opcional. Si no se carga logo del proyecto, se usara el logo de la empresa o CN.</p>
                    </div>
                  </div>
                  <div className="admin-proyecto-form-media-preview is-logo">
                    {logoPreviewUrl ? (
                      <img src={logoPreviewUrl} alt="Vista previa del logo del proyecto" />
                    ) : (
                      <span>Sin logo del proyecto</span>
                    )}
                  </div>
                  <label className="admin-proyecto-form-file">
                    <span>Seleccionar archivo</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      onChange={(event) => {
                        prepararArchivo(event.target.files?.[0], 'El logo del proyecto', setLogoFile, setLogoPreview);
                        event.target.value = '';
                      }}
                    />
                    <small>JPG, JPEG, PNG o WEBP. Tamano maximo 10MB.</small>
                  </label>
                  {form.logoUrl ? (
                    <p className="admin-proyecto-form-media-current">URL actual: {form.logoUrl}</p>
                  ) : null}
                  {logoFile ? (
                    <p className="admin-proyecto-form-media-current">Archivo seleccionado: {logoFile.name}</p>
                  ) : null}
                </section>
              </div>
            ) : null}
            <label className="admin-proyecto-form-check is-full">
              <input name="usarLogoEmpresa" type="checkbox" checked={form.usarLogoEmpresa} onChange={actualizarCampo} />
              <span>Usar logo de empresa</span>
            </label>
            <p className="admin-proyecto-form-help is-full">
              {form.usarLogoEmpresa
                ? 'Si el proyecto no tiene logo propio, se usara el logo de la empresa. Si la empresa no tiene logo, se usara el logo de CN.'
                : 'Este proyecto usara el logo general de CN, salvo que se capture un logo especifico.'}
            </p>
          </div>
        </section>

        <section className="admin-proyecto-form-card">
          <h2>Contacto</h2>
          <div className="admin-proyecto-form-grid">
            <label><span>Nombre contacto</span><input name="nombreContacto" value={form.nombreContacto} onChange={actualizarCampo} /></label>
            <label><span>Telefono contacto</span><input name="telefonoContacto" value={form.telefonoContacto} onChange={actualizarCampo} /></label>
            <label><span>WhatsApp contacto</span><input name="whatsappContacto" value={form.whatsappContacto} onChange={actualizarCampo} /></label>
            <label><span>Correo contacto</span><input name="correoContacto" type="email" value={form.correoContacto} onChange={actualizarCampo} /></label>
          </div>
        </section>

        <section className="admin-proyecto-form-card">
          <h2>Publicacion</h2>
          <div className="admin-proyecto-form-grid">
            <label>
              <span>Estatus publicacion</span>
              <select name="estatusPublicacion" value={form.estatusPublicacion} onChange={actualizarCampo}>
                {ESTATUS_PUBLICACION.map((estatus) => <option key={estatus} value={estatus}>{estatus}</option>)}
              </select>
            </label>
            <label className="admin-proyecto-form-check">
              <input name="mostrarEnPublico" type="checkbox" checked={form.mostrarEnPublico} onChange={actualizarCampo} />
              <span>Mostrar en publico</span>
            </label>
            {esEdicion ? (
              <p className="admin-proyecto-form-help is-full">Estado actual: {form.activo ? 'Activo' : 'Inactivo'}. Puedes cambiarlo desde el listado.</p>
            ) : null}
          </div>
        </section>

        <section className="admin-proyecto-form-actions">
          <button type="submit" disabled={guardando || (!puedeCrearProyecto && !esEdicion)}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
          <Link to="/admin/proyectos-inmobiliarios">Cancelar</Link>
          {esEdicion ? (
            <>
              <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/unidades`}>Unidades</Link>
              <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/modelos`}>Modelos</Link>
              <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/plano`}>Plano</Link>
              <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/imagenes`}>Imagenes</Link>
              <Link to={`/admin/proyectos-inmobiliarios/prospectos?proyectoId=${proyectoId}`}>Prospectos</Link>
              <Link to={`/admin/proyectos-inmobiliarios/apartados?proyectoId=${proyectoId}`}>Apartados</Link>
              {form.slug ? (
                <a href={`#/proyectos-inmobiliarios/${form.slug}`} target="_blank" rel="noopener noreferrer">Ver landing publica</a>
              ) : null}
            </>
          ) : null}
        </section>
      </form>
    </main>
  );
}
