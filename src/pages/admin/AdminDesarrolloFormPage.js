import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
  precioDesde: '',
  imagenPrincipalUrl: '',
  telefonoContacto: '',
  nombreContacto: '',
  destacado: false,
  activo: true,
};

const slugify = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible guardar el desarrollo.';

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
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const cargar = async () => {
      setCargando(true);
      setError('');

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

  const guardar = async (event) => {
    event.preventDefault();
    setGuardando(true);
    setError('');
    setMensaje('');

    try {
      const response = esEdicion
        ? await actualizarAdminDesarrollo(desarrolloId, form)
        : await crearAdminDesarrollo(form);

      setMensaje(esEdicion ? 'Desarrollo actualizado correctamente.' : 'Desarrollo creado correctamente.');

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
          <Field className="is-full" label="Descripcion">
            <textarea name="descripcion" value={form.descripcion} onChange={actualizarCampo} rows="5" />
          </Field>
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
          <Field label="Precio desde">
            <input name="precioDesde" type="number" min="0" step="0.01" value={form.precioDesde} onChange={actualizarCampo} />
          </Field>
          <Field label="Imagen principal URL">
            <input name="imagenPrincipalUrl" value={form.imagenPrincipalUrl} onChange={actualizarCampo} />
          </Field>
          <Field label="Telefono de contacto">
            <input
              name="telefonoContacto"
              value={form.telefonoContacto}
              onChange={actualizarCampo}
              maxLength="30"
              placeholder="Ej. +52 55 4085 9798"
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
              </>
            ) : null}
          </div>
        </div>
      </form>
    </main>
  );
}
