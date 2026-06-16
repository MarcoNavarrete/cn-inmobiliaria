import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import RichTextEditor from '../../components/common/RichTextEditor';
import { resolveApiAssetUrl } from '../../services/apiClient';
import {
  actualizarAdminDesarrollo,
  crearAdminDesarrollo,
  obtenerAdminDesarrollo,
} from '../../services/adminDesarrollosService';
import {
  obtenerEstados,
  obtenerLocalidades,
  obtenerPoblaciones,
} from '../../services/catalogosService';
import './AdminDesarrolloFormPage.css';

const FORM_INICIAL = {
  nombre: '',
  slug: '',
  descripcion: '',
  estadoId: '',
  poblacionId: '',
  localidadId: '',
  zona: '',
  direccion: '',
  latitud: '',
  longitud: '',
  urlGoogleMaps: '',
  precioDesde: '',
  imagenPrincipalUrl: '',
  telefonoContacto: '',
  nombreContacto: '',
  destacado: false,
  activo: true,
};

const EXTENSIONES_PERMITIDAS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const slugify = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible guardar el desarrollo.';

const getExtension = (file) => String(file?.name || '').split('.').pop().toLowerCase();

const revokePreviewUrl = (value) => {
  if (typeof value === 'string' && value.startsWith('blob:')) {
    URL.revokeObjectURL(value);
  }
};

const validarArchivoImagen = (file) => {
  if (!file) return '';

  const extension = getExtension(file);
  if (!EXTENSIONES_PERMITIDAS.includes(extension)) {
    return 'La imagen principal debe ser JPG, JPEG, PNG o WEBP.';
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'La imagen principal no debe pesar mas de 10MB.';
  }

  return '';
};

function Field({ children, className = '', label }) {
  return (
    <label className={`admin-desarrollos-field ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function AdminDesarrolloFormPage() {
  const { desarrolloId } = useParams();
  const navigate = useNavigate();
  const esEdicion = Boolean(desarrolloId);
  const [form, setForm] = useState(FORM_INICIAL);
  const [slugEditado, setSlugEditado] = useState(false);
  const [estados, setEstados] = useState([]);
  const [poblaciones, setPoblaciones] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [imagenPrincipalFile, setImagenPrincipalFile] = useState(null);
  const [imagenPrincipalPreview, setImagenPrincipalPreview] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const imagenPrincipalPreviewUrl = imagenPrincipalPreview || resolveApiAssetUrl(form.imagenPrincipalUrl);

  useEffect(() => {
    const controller = new AbortController();

    const cargar = async () => {
      setCargando(true);
      setError('');
      setImagenPrincipalFile(null);
      setImagenPrincipalPreview((actual) => {
        revokePreviewUrl(actual);
        return '';
      });

      try {
        const estadosData = await obtenerEstados({ signal: controller.signal });
        setEstados(estadosData);

        if (esEdicion) {
          const data = await obtenerAdminDesarrollo(desarrolloId, { signal: controller.signal });
          const nextForm = {
            nombre: data.nombre,
            slug: data.slug,
            descripcion: data.descripcion,
            estadoId: data.estadoId,
            poblacionId: data.poblacionId,
            localidadId: data.localidadId,
            zona: data.zona,
            direccion: data.direccion,
            latitud: data.latitud ?? '',
            longitud: data.longitud ?? '',
            urlGoogleMaps: data.urlGoogleMaps || '',
            precioDesde: data.precioDesde ?? '',
            imagenPrincipalUrl: data.imagenPrincipalUrl,
            telefonoContacto: data.telefonoContacto || '',
            nombreContacto: data.nombreContacto || '',
            destacado: data.destacado,
            activo: data.activo,
          };
          setForm(nextForm);
          setSlugEditado(true);

          if (nextForm.estadoId) {
            setPoblaciones(await obtenerPoblaciones(nextForm.estadoId, { signal: controller.signal }));
          }

          if (nextForm.estadoId && nextForm.poblacionId) {
            setLocalidades(await obtenerLocalidades(nextForm.estadoId, nextForm.poblacionId, { signal: controller.signal }));
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') setError(getApiErrorMessage(err));
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    };

    cargar();
    return () => controller.abort();
  }, [desarrolloId, esEdicion]);

  useEffect(() => () => {
    revokePreviewUrl(imagenPrincipalPreview);
  }, [imagenPrincipalPreview]);

  useEffect(() => {
    if (!form.estadoId) {
      setPoblaciones([]);
      setLocalidades([]);
      return undefined;
    }

    const controller = new AbortController();
    obtenerPoblaciones(form.estadoId, { signal: controller.signal })
      .then(setPoblaciones)
      .catch((err) => {
        if (err.name !== 'AbortError') setError('No fue posible cargar poblaciones.');
      });

    return () => controller.abort();
  }, [form.estadoId]);

  useEffect(() => {
    if (!form.estadoId || !form.poblacionId) {
      setLocalidades([]);
      return undefined;
    }

    const controller = new AbortController();
    obtenerLocalidades(form.estadoId, form.poblacionId, { signal: controller.signal })
      .then(setLocalidades)
      .catch((err) => {
        if (err.name !== 'AbortError') setError('No fue posible cargar localidades.');
      });

    return () => controller.abort();
  }, [form.estadoId, form.poblacionId]);

  const actualizarCampo = (event) => {
    const { checked, maxLength, name, type, value } = event.target;

    setForm((actual) => {
      const nextValue = maxLength > 0 ? value.slice(0, maxLength) : value;
      const siguiente = {
        ...actual,
        [name]: type === 'checkbox' ? checked : nextValue,
      };

      if (name === 'nombre' && !slugEditado) {
        siguiente.slug = slugify(nextValue);
      }

      if (name === 'slug') {
        siguiente.slug = slugify(nextValue);
        setSlugEditado(true);
      }

      if (name === 'estadoId') {
        siguiente.poblacionId = '';
        siguiente.localidadId = '';
      }

      if (name === 'poblacionId') {
        siguiente.localidadId = '';
      }

      return siguiente;
    });
  };

  const seleccionarImagenPrincipal = (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';

    revokePreviewUrl(imagenPrincipalPreview);
    setImagenPrincipalPreview('');

    if (!file) {
      setImagenPrincipalFile(null);
      return;
    }

    const errorArchivo = validarArchivoImagen(file);
    if (errorArchivo) {
      setImagenPrincipalFile(null);
      setError(errorArchivo);
      return;
    }

    setError('');
    setImagenPrincipalFile(file);
    setImagenPrincipalPreview(URL.createObjectURL(file));
  };

  const guardar = async (event) => {
    event.preventDefault();
    const latitud = String(form.latitud || '').trim();
    const longitud = String(form.longitud || '').trim();
    const latitudNumero = latitud === '' ? null : Number(latitud);
    const longitudNumero = longitud === '' ? null : Number(longitud);

    if (latitud !== '' && (Number.isNaN(latitudNumero) || latitudNumero < -90 || latitudNumero > 90)) {
      setError('Latitud debe estar entre -90 y 90.');
      return;
    }

    if (longitud !== '' && (Number.isNaN(longitudNumero) || longitudNumero < -180 || longitudNumero > 180)) {
      setError('Longitud debe estar entre -180 y 180.');
      return;
    }

    setGuardando(true);
    setError('');
    setMensaje('');

    try {
      const response = esEdicion
        ? await actualizarAdminDesarrollo(desarrolloId, form, { imagenPrincipalFile })
        : await crearAdminDesarrollo(form, { imagenPrincipalFile });

      setMensaje(esEdicion ? 'Desarrollo actualizado correctamente.' : 'Desarrollo creado correctamente.');
      setImagenPrincipalFile(null);

      if (!esEdicion) {
        const nuevoId = response?.desarrolloId || response?.id;
        if (nuevoId) navigate(`/admin/desarrollos/${nuevoId}/editar`, { replace: true });
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <main className="admin-desarrollos">
        <p className="admin-desarrollos-feedback">Cargando desarrollo...</p>
      </main>
    );
  }

  return (
    <main className="admin-desarrollos">
      <section className="admin-desarrollos-hero">
        <div>
          <p className="admin-desarrollos-eyebrow">Administracion</p>
          <h1>{esEdicion ? 'Editar desarrollo' : 'Nuevo desarrollo'}</h1>
        </div>
        <Link className="admin-desarrollos-primary" to="/admin/desarrollos">Volver al listado</Link>
      </section>

      {mensaje ? <p className="admin-desarrollos-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="admin-desarrollos-feedback is-error">{error}</p> : null}

      <form className="admin-desarrollos-form-card" onSubmit={guardar}>
        <div className="admin-desarrollos-form-grid">
          <Field label="Nombre">
            <input name="nombre" value={form.nombre} onChange={actualizarCampo} required />
          </Field>
          <Field label="Slug">
            <input name="slug" value={form.slug} onChange={actualizarCampo} required />
          </Field>
          <div className="admin-desarrollos-richtext is-full">
            <span>Descripcion</span>
            <RichTextEditor
              value={form.descripcion || ''}
              onChange={(html) => setForm((actual) => ({ ...actual, descripcion: html }))}
              placeholder="Describe el desarrollo, amenidades, ubicacion y propuesta de valor..."
              disabled={guardando}
            />
            <p className="admin-desarrollos-field-help">
              Puedes usar subtitulos, negritas, vinetas y alineacion para mejorar la presentacion publica del desarrollo.
            </p>
          </div>
          <div className="admin-desarrollos-form-section is-full">
            <h2>Ubicacion del desarrollo</h2>
            <p>Puedes copiar las coordenadas desde Google Maps haciendo clic derecho sobre el punto exacto del desarrollo.</p>
          </div>
          <Field label="Estado">
            <select name="estadoId" value={form.estadoId} onChange={actualizarCampo}>
              <option value="">Selecciona estado</option>
              {estados.map((estado) => <option key={estado.id} value={estado.id}>{estado.nombre}</option>)}
            </select>
          </Field>
          <Field label="Poblacion / municipio">
            <select name="poblacionId" value={form.poblacionId} onChange={actualizarCampo} disabled={!form.estadoId}>
              <option value="">Selecciona poblacion</option>
              {poblaciones.map((poblacion) => <option key={poblacion.id} value={poblacion.id}>{poblacion.nombre}</option>)}
            </select>
          </Field>
          <Field label="Localidad / colonia">
            <select name="localidadId" value={form.localidadId} onChange={actualizarCampo} disabled={!form.poblacionId}>
              <option value="">Selecciona localidad</option>
              {localidades.map((localidad) => <option key={localidad.id} value={localidad.id}>{localidad.nombre}</option>)}
            </select>
          </Field>
          <Field label="Zona">
            <input name="zona" value={form.zona} onChange={actualizarCampo} />
          </Field>
          <Field className="is-full" label="Direccion">
            <input name="direccion" value={form.direccion} onChange={actualizarCampo} />
          </Field>
          <Field label="Latitud">
            <input name="latitud" type="number" min="-90" max="90" step="0.000001" value={form.latitud} onChange={actualizarCampo} placeholder="Ej. 20.123456" />
          </Field>
          <Field label="Longitud">
            <input name="longitud" type="number" min="-180" max="180" step="0.000001" value={form.longitud} onChange={actualizarCampo} placeholder="Ej. -98.123456" />
          </Field>
          <Field className="is-full" label="URL de Google Maps">
            <input
              name="urlGoogleMaps"
              type="url"
              value={form.urlGoogleMaps}
              onChange={actualizarCampo}
              placeholder="https://www.google.com/maps/..."
            />
            <small className="admin-desarrollos-field-help">
              Puedes copiar las coordenadas desde Google Maps haciendo clic derecho sobre el punto exacto del desarrollo.
            </small>
          </Field>
          <Field label="Precio desde">
            <input name="precioDesde" type="number" min="0" step="0.01" value={form.precioDesde} onChange={actualizarCampo} />
          </Field>
          <section className="admin-desarrollos-media-card is-full">
            <div className="admin-desarrollos-media-head">
              <div>
                <span>Imagen principal</span>
                <p>Portada publica del desarrollo en listados y landing.</p>
              </div>
            </div>
            <div className="admin-desarrollos-media-preview">
              {imagenPrincipalPreviewUrl ? (
                <img src={imagenPrincipalPreviewUrl} alt="Vista previa de imagen principal del desarrollo" />
              ) : (
                <span>Sin imagen principal</span>
              )}
            </div>
            <label className="admin-desarrollos-file">
              <span>Seleccionar imagen</span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp,image/*"
                onChange={seleccionarImagenPrincipal}
                disabled={guardando}
              />
              <small>JPG, JPEG, PNG o WEBP. Tamano maximo 10MB.</small>
            </label>
            {form.imagenPrincipalUrl ? (
              <p className="admin-desarrollos-media-current">Imagen actual: {form.imagenPrincipalUrl}</p>
            ) : null}
            {imagenPrincipalFile ? (
              <p className="admin-desarrollos-media-current">Archivo seleccionado: {imagenPrincipalFile.name}</p>
            ) : null}
          </section>
          <Field label="Telefono de contacto">
            <input
              name="telefonoContacto"
              value={form.telefonoContacto}
              onChange={actualizarCampo}
              maxLength="30"
              placeholder="Ej. +52 771 670 7794"
            />
          </Field>
          <Field label="Nombre de contacto">
            <input
              name="nombreContacto"
              value={form.nombreContacto}
              onChange={actualizarCampo}
              maxLength="150"
              placeholder="Ej. Asesor comercial"
            />
          </Field>
          <div className="admin-desarrollos-checks">
            <label className="admin-desarrollos-check">
              <input name="destacado" type="checkbox" checked={form.destacado} onChange={actualizarCampo} />
              <span>Destacado</span>
            </label>
            <label className="admin-desarrollos-check">
              <input name="activo" type="checkbox" checked={form.activo} onChange={actualizarCampo} />
              <span>Activo</span>
            </label>
          </div>
          <div className="admin-desarrollos-form-actions">
            <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar desarrollo'}</button>
            {esEdicion ? (
              <>
                <Link to={`/admin/desarrollos/${desarrolloId}/imagenes`}>Imagenes</Link>
                <Link to={`/admin/desarrollos/${desarrolloId}/amenidades`}>Amenidades</Link>
                <Link to={`/admin/desarrollos/${desarrolloId}/modelos`}>Modelos</Link>
                <Link to={`/admin/desarrollos/${desarrolloId}/unidades`}>Administrar unidades</Link>
              </>
            ) : null}
          </div>
        </div>
      </form>
    </main>
  );
}

