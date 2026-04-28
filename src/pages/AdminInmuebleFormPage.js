import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  actualizarInmueble,
  crearInmueble,
  obtenerInmuebleAdmin,
} from '../services/inmueblesService';
import {
  obtenerEstados,
  obtenerLocalidades,
  obtenerPoblaciones,
  obtenerTiposInmueble,
} from '../services/catalogosService';
import { obtenerUsuarioDesdeToken } from '../services/authService';
import './AdminInmuebleFormPage.css';

const FORM_INICIAL = {
  titulo: '',
  descripcion: '',
  precio: '',
  recalcularPrecio: false,
  tipoInmueble: '',
  moneda: 'MXN',
  superficieM2: '',
  construccionM2: '',
  estadoId: '',
  municipioId: '',
  localidadId: '',
  direccion: '',
  referencia: '',
  latitud: '',
  longitud: '',
  destacado: false,
  estatus: 'BORRADOR',
};

const MONEDAS = ['MXN', 'USD'];
const ESTATUS_INMUEBLE = ['BORRADOR', 'PENDIENTE_REVISION', 'DISPONIBLE', 'APARTADO', 'VENDIDO', 'RECHAZADO', 'INACTIVO'];
const ROLES_ADMIN = ['ADMIN', 'SUPERADMIN'];

const toFormValue = (value) => (value === null || value === undefined ? '' : String(value));

const pickFirst = (...values) => values.find((value) => value !== undefined && value !== null);

const buildFormFromInmueble = (inmueble) => ({
  titulo: inmueble?.titulo || '',
  descripcion: inmueble?.descripcion || '',
  precio: toFormValue(inmueble?.precio),
  recalcularPrecio: pickFirst(inmueble?.recalcularPrecio, false) === true,
  tipoInmueble: toFormValue(pickFirst(inmueble?.tipoInmueble, inmueble?.TipoInmueble)).trim(),
  moneda: inmueble?.moneda || 'MXN',
  superficieM2: toFormValue(inmueble?.superficieM2),
  construccionM2: toFormValue(inmueble?.construccionM2),
  estadoId: toFormValue(pickFirst(inmueble?.estadoId, inmueble?.EstadoId)),
  municipioId: toFormValue(pickFirst(inmueble?.municipioId, inmueble?.poblacionId, inmueble?.MunicipioId, inmueble?.PoblacionId)),
  localidadId: toFormValue(pickFirst(inmueble?.localidadId, inmueble?.LocalidadId)),
  direccion: inmueble?.direccion || '',
  referencia: inmueble?.referencia || '',
  latitud: toFormValue(inmueble?.latitud),
  longitud: toFormValue(inmueble?.longitud),
  destacado: pickFirst(inmueble?.destacado, inmueble?.esDestacado, false) === true,
  estatus: inmueble?.estatus || (pickFirst(inmueble?.activo, inmueble?.esActivo, true) === false ? 'INACTIVO' : 'DISPONIBLE'),
});

const getApiErrorMessage = (err) => {
  if (err.data?.mensaje) {
    return err.data.mensaje;
  }

  if (err.data?.message) {
    return err.data.message;
  }

  const errors = err.data?.errors;

  if (errors && typeof errors === 'object') {
    return Object.entries(errors)
      .flatMap(([field, messages]) => {
        const normalizedMessages = Array.isArray(messages) ? messages : [messages];
        return normalizedMessages.map((message) => `${field}: ${message}`);
      })
      .join(' ');
  }

  return err.data?.mensaje || err.data?.message || err.message || 'No fue posible guardar el inmueble.';
};

function Field({ children, label }) {
  return (
    <label className="admin-inmueble-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function AdminInmuebleFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esEdicion = Boolean(id);
  const usuario = obtenerUsuarioDesdeToken();
  const esAdmin = ROLES_ADMIN.includes(String(usuario?.rol || '').toUpperCase());
  const [form, setForm] = useState(FORM_INICIAL);
  const [estados, setEstados] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [tiposInmueble, setTiposInmueble] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const estadoSeleccionado = form.estadoId;
  const municipioSeleccionado = form.municipioId;

  const tituloPagina = useMemo(
    () => (esEdicion ? `Editar inmueble ${id}` : 'Nuevo inmueble'),
    [esEdicion, id]
  );

  const cargarEstados = useCallback(async (signal) => {
    const data = await obtenerEstados({ signal });
    setEstados(data);
  }, []);

  const cargarTiposInmueble = useCallback(async (signal) => {
    const data = await obtenerTiposInmueble({ signal });
    setTiposInmueble(data);
  }, []);

  const cargarMunicipios = useCallback(async (estadoId, signal) => {
    if (!estadoId) {
      setMunicipios([]);
      return;
    }

    const data = await obtenerPoblaciones(estadoId, { signal });
    setMunicipios(data);
  }, []);

  const cargarLocalidades = useCallback(async (estadoId, municipioId, signal) => {
    if (!estadoId || !municipioId) {
      setLocalidades([]);
      return;
    }

    const data = await obtenerLocalidades(estadoId, municipioId, { signal });
    setLocalidades(data);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const cargarInicial = async () => {
      setCargando(true);
      setError('');

      try {
        await Promise.all([
          cargarEstados(controller.signal),
          cargarTiposInmueble(controller.signal),
        ]);

        if (esEdicion) {
          const inmueble = await obtenerInmuebleAdmin(id, { signal: controller.signal });
          const formEdit = buildFormFromInmueble(inmueble);
          setForm(formEdit);
          await cargarMunicipios(formEdit.estadoId, controller.signal);
          await cargarLocalidades(formEdit.estadoId, formEdit.municipioId, controller.signal);
        } else {
          setForm(FORM_INICIAL);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'No fue posible cargar la informacion del inmueble.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    };

    cargarInicial();

    return () => controller.abort();
  }, [cargarEstados, cargarLocalidades, cargarMunicipios, cargarTiposInmueble, esEdicion, id]);

  useEffect(() => {
    if (cargando) {
      return undefined;
    }

    const controller = new AbortController();

    const actualizarMunicipios = async () => {
      setCargandoCatalogos(true);

      try {
        await cargarMunicipios(estadoSeleccionado, controller.signal);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'No fue posible cargar municipios.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargandoCatalogos(false);
        }
      }
    };

    actualizarMunicipios();

    return () => controller.abort();
  }, [estadoSeleccionado, cargarMunicipios, cargando]);

  useEffect(() => {
    if (cargando) {
      return undefined;
    }

    const controller = new AbortController();

    const actualizarLocalidades = async () => {
      setCargandoCatalogos(true);

      try {
        await cargarLocalidades(estadoSeleccionado, municipioSeleccionado, controller.signal);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'No fue posible cargar localidades.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargandoCatalogos(false);
        }
      }
    };

    actualizarLocalidades();

    return () => controller.abort();
  }, [estadoSeleccionado, municipioSeleccionado, cargarLocalidades, cargando]);

  const actualizarCampo = (event) => {
    const { checked, name, type, value } = event.target;

    setForm((actual) => {
      const siguiente = {
        ...actual,
        [name]: type === 'checkbox' ? checked : value,
      };

      if (name === 'estadoId') {
        siguiente.municipioId = '';
        siguiente.localidadId = '';
      }

      if (name === 'municipioId') {
        siguiente.localidadId = '';
      }

      return siguiente;
    });
  };

  const guardar = async (event) => {
    event.preventDefault();
    setGuardando(true);
    setMensaje('');
    setError('');

    try {
      const response = esEdicion
        ? await actualizarInmueble(id, form)
        : await crearInmueble(form);

      setMensaje(esEdicion ? 'Inmueble actualizado correctamente.' : 'Inmueble creado correctamente.');

      if (!esEdicion) {
        const nuevoId = response?.inmuebleId ?? response?.id;

        if (nuevoId) {
          navigate(`/admin/inmuebles/editar/${nuevoId}`, { replace: true });
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
      <main className="admin-inmueble">
        <p className="admin-inmueble-feedback">Cargando inmueble...</p>
      </main>
    );
  }

  return (
    <main className="admin-inmueble">
      <section className="admin-inmueble-hero">
        <div>
          <p className="admin-inmueble-eyebrow">Administracion</p>
          <h1>{tituloPagina}</h1>
        </div>
        <div className="admin-inmueble-hero-actions">
          {esEdicion ? (
            <>
              <Link className="admin-inmueble-secondary" to={`/admin/inmuebles/${id}/imagenes`}>
                Administrar imagenes
              </Link>
              <Link className="admin-inmueble-secondary" to={`/admin/tours360/${id}`}>
                Tour 360
              </Link>
            </>
          ) : null}
          <Link className="admin-inmueble-secondary" to="/propiedades">
            Ver propiedades
          </Link>
        </div>
      </section>

      {mensaje ? <p className="admin-inmueble-alert admin-inmueble-alert-ok">{mensaje}</p> : null}
      {error ? <p className="admin-inmueble-alert admin-inmueble-alert-error">{error}</p> : null}

      <form className="admin-inmueble-form" onSubmit={guardar}>
        <section className="admin-inmueble-card">
          <h2>Datos generales</h2>
          <div className="admin-inmueble-grid">
            <Field label="Titulo">
              <input name="titulo" value={form.titulo} onChange={actualizarCampo} required />
            </Field>
            <Field label="Tipo inmueble">
              <select name="tipoInmueble" value={form.tipoInmueble} onChange={actualizarCampo} required>
                <option value="">Selecciona tipo</option>
                {tiposInmueble.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                ))}
              </select>
            </Field>
            <Field label="Precio">
              <input name="precio" type="number" min="0" step="0.01" value={form.precio} onChange={actualizarCampo} required />
            </Field>
            <label className="admin-inmueble-check">
              <input name="recalcularPrecio" type="checkbox" checked={form.recalcularPrecio} onChange={actualizarCampo} />
              <span>Recalcular precio</span>
            </label>
            <Field label="Moneda">
              <select name="moneda" value={form.moneda} onChange={actualizarCampo}>
                {MONEDAS.map((moneda) => (
                  <option key={moneda} value={moneda}>{moneda}</option>
                ))}
              </select>
            </Field>
            <Field label="Superficie m2">
              <input name="superficieM2" type="number" min="0" step="0.01" value={form.superficieM2} onChange={actualizarCampo} />
            </Field>
            <Field label="Construccion m2">
              <input name="construccionM2" type="number" min="0" step="0.01" value={form.construccionM2} onChange={actualizarCampo} />
            </Field>
            <Field label="Descripcion">
              <textarea name="descripcion" value={form.descripcion} onChange={actualizarCampo} rows="5" required />
            </Field>
          </div>
        </section>

        <section className="admin-inmueble-card">
          <div className="admin-inmueble-card-head">
            <h2>Ubicacion</h2>
            {cargandoCatalogos ? <span className="admin-inmueble-pill">Cargando catalogos</span> : null}
          </div>
          <div className="admin-inmueble-grid three">
            <Field label="Estado">
              <select name="estadoId" value={form.estadoId} onChange={actualizarCampo} required>
                <option value="">Selecciona estado</option>
                {estados.map((estado) => (
                  <option key={estado.id} value={estado.id}>
                    {estado.nombre}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Municipio">
              <select name="municipioId" value={form.municipioId} onChange={actualizarCampo} required disabled={!form.estadoId}>
                <option value="">Selecciona municipio</option>
                {municipios.map((municipio) => (
                  <option key={municipio.id} value={municipio.id}>
                    {municipio.nombre}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Localidad">
              <select name="localidadId" value={form.localidadId} onChange={actualizarCampo} required disabled={!form.municipioId}>
                <option value="">Selecciona localidad</option>
                {localidades.map((localidad) => (
                  <option key={localidad.id} value={localidad.id}>
                    {localidad.nombre}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Direccion">
              <input name="direccion" value={form.direccion} onChange={actualizarCampo} />
            </Field>
            <Field label="Referencia">
              <input name="referencia" value={form.referencia} onChange={actualizarCampo} />
            </Field>
          </div>
        </section>

        <section className="admin-inmueble-card">
          <h2>Mapa</h2>
          <div className="admin-inmueble-grid two">
            <Field label="Latitud">
              <input name="latitud" type="number" step="0.000001" value={form.latitud} onChange={actualizarCampo} />
            </Field>
            <Field label="Longitud">
              <input name="longitud" type="number" step="0.000001" value={form.longitud} onChange={actualizarCampo} />
            </Field>
          </div>
        </section>

        <section className="admin-inmueble-card">
          <h2>Publicacion</h2>
          <div className="admin-inmueble-checks">
            <Field label="Estatus">
              <select name="estatus" value={form.estatus} onChange={actualizarCampo} required disabled={!esAdmin}>
                {ESTATUS_INMUEBLE.map((estatus) => (
                  <option key={estatus} value={estatus}>{estatus}</option>
                ))}
              </select>
            </Field>
            <label className="admin-inmueble-check">
              <input name="destacado" type="checkbox" checked={form.destacado} onChange={actualizarCampo} />
              <span>Destacado</span>
            </label>
          </div>
          {form.estatus === 'BORRADOR' ? (
            <div className="admin-inmueble-help">
              <span>Guarda el inmueble y despues envialo a revision desde Mis propiedades.</span>
              <Link to="/admin/propiedades">Ir a Mis propiedades</Link>
            </div>
          ) : null}
        </section>

        <div className="admin-inmueble-actions">
          <button type="submit" className="admin-inmueble-primary" disabled={guardando}>
            {guardando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear inmueble'}
          </button>
          {esEdicion ? (
            <Link className="admin-inmueble-secondary" to={`/propiedad/${id}`}>
              Ver detalle
            </Link>
          ) : null}
        </div>
      </form>
    </main>
  );
}
