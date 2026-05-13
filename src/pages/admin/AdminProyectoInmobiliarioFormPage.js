import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { listarEmpresas } from '../../services/empresasInmobiliariasService';
import {
  actualizarProyecto,
  crearProyecto,
  obtenerProyecto,
} from '../../services/proyectosInmobiliariosService';
import './AdminProyectoInmobiliarioFormPage.css';

const FORM_INICIAL = {
  empresaId: '',
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

const mapProyectoToForm = (proyecto = {}) => ({
  empresaId: toInputValue(proyecto.empresaId),
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
  const navigate = useNavigate();
  const esEdicion = Boolean(proyectoId);
  const [empresas, setEmpresas] = useState([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const empresaPreferidaId = useMemo(() => {
    const cn = empresas.find((empresa) => /cn/i.test(empresa.nombre || empresa.razonSocial || ''));
    return String((cn || empresas[0])?.id || '');
  }, [empresas]);

  const cargarDatos = useCallback(async (options = {}) => {
    setCargando(true);
    setError('');

    try {
      const empresasData = await listarEmpresas({ soloActivas: true, signal: options.signal });
      setEmpresas(empresasData);

      if (esEdicion) {
        const proyecto = await obtenerProyecto(proyectoId, { signal: options.signal });
        setForm(mapProyectoToForm(proyecto));
      } else {
        const cn = empresasData.find((empresa) => /cn/i.test(empresa.nombre || empresa.razonSocial || ''));
        setForm({
          ...FORM_INICIAL,
          empresaId: String((cn || empresasData[0])?.id || ''),
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
  }, [esEdicion, proyectoId]);

  useEffect(() => {
    const controller = new AbortController();
    cargarDatos({ signal: controller.signal });
    return () => controller.abort();
  }, [cargarDatos]);

  useEffect(() => {
    if (!esEdicion && !form.empresaId && empresaPreferidaId) {
      setForm((actual) => ({ ...actual, empresaId: empresaPreferidaId }));
    }
  }, [empresaPreferidaId, esEdicion, form.empresaId]);

  const actualizarCampo = (event) => {
    const { checked, name, type, value } = event.target;
    setForm((actual) => ({
      ...actual,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const generarSlugDesdeNombre = () => {
    setForm((actual) => ({
      ...actual,
      slug: generarSlug(actual.nombre),
    }));
  };

  const validar = () => {
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

      if (esEdicion) {
        await actualizarProyecto(proyectoId, payload);
        setMensaje('Proyecto actualizado correctamente.');
      } else {
        const response = await crearProyecto(payload);
        const nuevoId = pickProyectoId(response);
        setMensaje('Proyecto creado correctamente.');

        if (nuevoId) {
          navigate(`/admin/proyectos-inmobiliarios/${nuevoId}/editar`, { replace: true });
        } else {
          navigate('/admin/proyectos-inmobiliarios', { replace: true });
        }
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <main className="admin-proyecto-form">
        <p className="admin-proyecto-form-feedback">Cargando proyecto...</p>
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
            <label>
              <span>Empresa inmobiliaria</span>
              <select name="empresaId" value={form.empresaId} onChange={actualizarCampo} required>
                <option value="">Selecciona empresa</option>
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>
                ))}
              </select>
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
            <label className="is-full"><span>Imagen principal URL</span><input name="imagenPrincipalUrl" value={form.imagenPrincipalUrl} onChange={actualizarCampo} /></label>
            <label className="is-full"><span>Logo URL</span><input name="logoUrl" value={form.logoUrl} onChange={actualizarCampo} /></label>
            <label className="admin-proyecto-form-check is-full">
              <input name="usarLogoEmpresa" type="checkbox" checked={form.usarLogoEmpresa} onChange={actualizarCampo} />
              <span>Usar logo de empresa</span>
            </label>
            <p className="admin-proyecto-form-help is-full">
              {form.usarLogoEmpresa
                ? 'Si el proyecto no tiene logo propio, se usara el logo de la empresa. Si la empresa no tiene logo, se usara el logo de CN.'
                : 'Este proyecto usara el logo general de CN, salvo que se capture un Logo URL especifico.'}
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
          <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
          <Link to="/admin/proyectos-inmobiliarios">Cancelar</Link>
          {esEdicion ? (
            <>
              <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/unidades`}>Unidades</Link>
              <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/modelos`}>Modelos</Link>
              <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/plano`}>Plano</Link>
              <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/imagenes`}>Imagenes</Link>
              <Link to={`/admin/proyectos-inmobiliarios/${proyectoId}/prospectos`}>Prospectos</Link>
            </>
          ) : null}
        </section>
      </form>
    </main>
  );
}
