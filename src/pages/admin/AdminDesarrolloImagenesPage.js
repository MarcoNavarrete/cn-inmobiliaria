import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  actualizarAdminDesarrollo,
  actualizarDesarrolloImagen,
  crearDesarrolloImagen,
  eliminarDesarrolloImagen,
  listarDesarrolloImagenes,
  obtenerAdminDesarrollo,
  subirImagenDesarrollo,
} from '../../services/adminDesarrollosService';
import ImageUploaderDropzone from '../../components/admin/ImageUploaderDropzone';
import './AdminDesarrolloImagenesPage.css';

const FORM_INICIAL = { url: '', titulo: '', orden: 0, activo: true };
const getApiErrorMessage = (err) => err.data?.mensaje || err.data?.message || err.message || 'No fue posible procesar imagenes.';

export default function AdminDesarrolloImagenesPage() {
  const { desarrolloId } = useParams();
  const [imagenes, setImagenes] = useState([]);
  const [desarrollo, setDesarrollo] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [cargando, setCargando] = useState(true);
  const [registrandoUpload, setRegistrandoUpload] = useState(false);
  const [mostrarManual, setMostrarManual] = useState(false);
  const [accionandoId, setAccionandoId] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback(async (options = {}) => {
    setCargando(true);
    setError('');
    try {
      const [imagenesData, desarrolloData] = await Promise.all([
        listarDesarrolloImagenes(desarrolloId, options),
        obtenerAdminDesarrollo(desarrolloId, options),
      ]);
      setImagenes(imagenesData);
      setDesarrollo(desarrolloData);
    } catch (err) {
      if (err.name !== 'AbortError') setError(getApiErrorMessage(err));
    } finally {
      if (!options.signal?.aborted) setCargando(false);
    }
  }, [desarrolloId]);

  useEffect(() => {
    const controller = new AbortController();
    cargar({ signal: controller.signal });
    return () => controller.abort();
  }, [cargar]);

  const actualizarForm = (event) => {
    const { checked, name, type, value } = event.target;
    setForm((actual) => ({ ...actual, [name]: type === 'checkbox' ? checked : value }));
  };

  const actualizarLocal = (imagenId, cambios) => {
    setImagenes((actuales) => actuales.map((item) => item.id === imagenId ? { ...item, ...cambios } : item));
  };

  const calcularSiguienteOrden = () => {
    const ordenes = imagenes.map((imagen) => Number(imagen.orden)).filter((orden) => Number.isFinite(orden));
    return ordenes.length === 0 ? 1 : Math.max(...ordenes) + 1;
  };

  const registrarUpload = async (response) => {
    const url = response?.url || response?.Url || '';

    if (!url) {
      setError('El API no devolvio la URL de la imagen.');
      return;
    }

    setRegistrandoUpload(true);
    setError('');
    setMensaje('');

    try {
      await crearDesarrolloImagen(desarrolloId, {
        url,
        titulo: '',
        orden: calcularSiguienteOrden(),
        activo: true,
      });
      setMensaje('Imagen subida y registrada correctamente.');
      await cargar();
    } catch (err) {
      setForm((actual) => ({
        ...actual,
        url,
        orden: calcularSiguienteOrden(),
        activo: true,
      }));
      setMostrarManual(true);
      setError('La imagen se subio al servidor, pero no se pudo registrar. Intenta agregarla manualmente.');
    } finally {
      setRegistrandoUpload(false);
    }
  };

  const agregar = async (event) => {
    event.preventDefault();
    setError('');
    setMensaje('');

    if (!form.url.trim()) {
      setError('Agrega una URL o sube una imagen antes de guardar.');
      return;
    }

    try {
      await crearDesarrolloImagen(desarrolloId, {
        url: form.url,
        titulo: form.titulo,
        orden: Number(form.orden) || 0,
        activo: form.activo,
      });
      setForm(FORM_INICIAL);
      setMensaje('Imagen agregada.');
      await cargar();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const guardar = async (imagen) => {
    setAccionandoId(imagen.id);
    setError('');
    setMensaje('');
    try {
      await actualizarDesarrolloImagen(desarrolloId, imagen.id, {
        url: imagen.urlOriginal || imagen.url,
        titulo: imagen.titulo,
        orden: Number(imagen.orden) || 0,
        activo: imagen.activo,
      });
      setMensaje('Imagen actualizada.');
      await cargar();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionandoId('');
    }
  };

  const eliminar = async (imagen) => {
    if (!window.confirm('Eliminar esta imagen?')) return;
    setAccionandoId(imagen.id);
    setError('');
    setMensaje('');
    try {
      await eliminarDesarrolloImagen(desarrolloId, imagen.id);
      setMensaje('Imagen eliminada.');
      await cargar();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionandoId('');
    }
  };

  const usarComoPortada = async (imagen) => {
    const url = imagen.urlOriginal || imagen.url;

    if (!url) {
      setError('Esta imagen no tiene URL disponible.');
      return;
    }

    setAccionandoId(`portada-${imagen.id}`);
    setError('');
    setMensaje('');

    try {
      const detalle = desarrollo || await obtenerAdminDesarrollo(desarrolloId);

      await actualizarAdminDesarrollo(desarrolloId, {
        nombre: detalle.nombre,
        slug: detalle.slug,
        descripcion: detalle.descripcion,
        estadoId: detalle.estadoId,
        poblacionId: detalle.poblacionId,
        localidadId: detalle.localidadId,
        zona: detalle.zona,
        direccion: detalle.direccion,
        precioDesde: detalle.precioDesde,
        imagenPrincipalUrl: url,
        telefonoContacto: detalle.telefonoContacto,
        nombreContacto: detalle.nombreContacto,
        destacado: detalle.destacado,
        activo: detalle.activo,
      });

      setMensaje('Portada actualizada correctamente.');
      await cargar();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionandoId('');
    }
  };

  const esPortadaActual = (imagen) => {
    const actual = String(desarrollo?.imagenPrincipalUrl || '').trim();
    const urlOriginal = String(imagen.urlOriginal || '').trim();
    const urlResuelta = String(imagen.url || '').trim();

    return Boolean(actual) && (actual === urlOriginal || actual === urlResuelta);
  };

  return (
    <main className="admin-desarrollos">
      <section className="admin-desarrollos-hero">
        <div>
          <p className="admin-desarrollos-eyebrow">Administracion</p>
          <h1>Imagenes del desarrollo</h1>
        </div>
        <Link className="admin-desarrollos-primary" to={`/admin/desarrollos/${desarrolloId}/editar`}>Editar desarrollo</Link>
      </section>

      {mensaje ? <p className="admin-desarrollos-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="admin-desarrollos-feedback is-error">{error}</p> : null}

      <section className="admin-desarrollos-form-card">
        <ImageUploaderDropzone
          disabled={registrandoUpload}
          uploadFile={(file) => subirImagenDesarrollo(desarrolloId, file)}
          onUploaded={registrarUpload}
        />
        {registrandoUpload ? <p className="admin-desarrollos-empty">Registrando imagen en la base de datos...</p> : null}
        <button
          type="button"
          className="admin-desarrollos-link-button"
          onClick={() => setMostrarManual((actual) => !actual)}
        >
          Agregar imagen por URL manual
        </button>
        {mostrarManual ? (
          <form className="admin-desarrollos-manual-form" onSubmit={agregar}>
            <div className="admin-desarrollos-inline-grid">
              <label className="admin-desarrollos-field is-full"><span>URL de imagen</span><input name="url" value={form.url} onChange={actualizarForm} required /></label>
              <label className="admin-desarrollos-field"><span>Titulo</span><input name="titulo" value={form.titulo} onChange={actualizarForm} /></label>
              <label className="admin-desarrollos-field"><span>Orden</span><input name="orden" type="number" value={form.orden} onChange={actualizarForm} /></label>
              <label className="admin-desarrollos-check"><input name="activo" type="checkbox" checked={form.activo} onChange={actualizarForm} /><span>Activo</span></label>
              <div className="admin-desarrollos-form-actions"><button type="submit">Guardar imagen manual</button></div>
            </div>
          </form>
        ) : null}
      </section>

      <section className="admin-desarrollos-card">
        {cargando ? <p className="admin-desarrollos-empty">Cargando imagenes...</p> : null}
        {!cargando && imagenes.length === 0 ? <p className="admin-desarrollos-empty">Este desarrollo aun no tiene imagenes.</p> : null}
        <div className="admin-desarrollos-list">
          {imagenes.map((imagen) => (
            <article key={imagen.id} className="admin-desarrollos-item">
              <div className="admin-desarrollos-preview-wrap">
                {imagen.url ? <img className="admin-desarrollos-preview" src={imagen.url} alt="" /> : <span className="admin-desarrollos-placeholder">Sin imagen</span>}
                {esPortadaActual(imagen) ? <span>Portada</span> : null}
              </div>
              <div className="admin-desarrollos-inline-grid">
                <label className="admin-desarrollos-field is-full"><span>Titulo</span><input value={imagen.titulo} onChange={(event) => actualizarLocal(imagen.id, { titulo: event.target.value })} /></label>
                <label className="admin-desarrollos-field"><span>Orden</span><input type="number" value={imagen.orden} onChange={(event) => actualizarLocal(imagen.id, { orden: event.target.value })} /></label>
                <label className="admin-desarrollos-check"><input type="checkbox" checked={imagen.activo} onChange={(event) => actualizarLocal(imagen.id, { activo: event.target.checked })} /><span>Activo</span></label>
                <div className="admin-desarrollos-actions">
                  <button type="button" onClick={() => guardar(imagen)} disabled={accionandoId === imagen.id}>Guardar</button>
                  <button
                    type="button"
                    onClick={() => usarComoPortada(imagen)}
                    disabled={accionandoId === `portada-${imagen.id}` || esPortadaActual(imagen)}
                  >
                    {accionandoId === `portada-${imagen.id}` ? 'Guardando...' : 'Usar como portada'}
                  </button>
                  <button type="button" className="is-danger" onClick={() => eliminar(imagen)} disabled={accionandoId === imagen.id}>Eliminar</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
