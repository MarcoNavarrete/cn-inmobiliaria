import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  actualizarOrdenImagen,
  eliminarImagenInmueble,
  marcarImagenPrincipal,
  obtenerImagenesInmueble,
  subirImagenInmueble,
} from '../services/inmuebleImagenesService';
import './AdminInmuebleImagenesPage.css';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const crearItemImagen = (file, index) => ({
  id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
  file,
  nombre: file.name,
  orden: index + 1,
  previewUrl: URL.createObjectURL(file),
});

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible procesar las imagenes.';

export default function AdminInmuebleImagenesPage() {
  const { id, inmuebleId: inmuebleIdParam } = useParams();
  const inmuebleId = id || inmuebleIdParam || '';
  const inputRef = useRef(null);
  const imagenesRef = useRef([]);
  const [imagenes, setImagenes] = useState([]);
  const [imagenesExistentes, setImagenesExistentes] = useState([]);
  const [principalId, setPrincipalId] = useState('');
  const [arrastrando, setArrastrando] = useState(false);
  const [cargandoExistentes, setCargandoExistentes] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [accionandoId, setAccionandoId] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    imagenesRef.current = imagenes;
  }, [imagenes]);

  useEffect(() => () => {
    imagenesRef.current.forEach((imagen) => URL.revokeObjectURL(imagen.previewUrl));
  }, []);

  const cargarImagenesExistentes = useCallback(async (options = {}) => {
    if (!inmuebleId) {
      setImagenesExistentes([]);
      setError('No se recibio el identificador del inmueble.');
      setCargandoExistentes(false);
      return;
    }

    setCargandoExistentes(true);
    setError('');

    try {
      const data = await obtenerImagenesInmueble(inmuebleId, options);
      setImagenesExistentes(data);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(getApiErrorMessage(err));
      }
    } finally {
      if (!options.signal?.aborted) {
        setCargandoExistentes(false);
      }
    }
  }, [inmuebleId]);

  useEffect(() => {
    const controller = new AbortController();
    cargarImagenesExistentes({ signal: controller.signal });
    return () => controller.abort();
  }, [cargarImagenesExistentes]);

  const agregarArchivos = (files) => {
    const validFiles = Array.from(files || []).filter((file) => IMAGE_TYPES.includes(file.type));

    if (validFiles.length === 0) {
      setError('Selecciona imagenes JPG, PNG o WEBP.');
      return;
    }

    setError('');
    setMensaje('');

    setImagenes((actuales) => {
      const nuevos = validFiles.map((file, index) => crearItemImagen(file, actuales.length + index));
      const siguientes = [...actuales, ...nuevos];

      if (!principalId && nuevos[0]) {
        setPrincipalId(nuevos[0].id);
      }

      return siguientes;
    });
  };

  const abrirSelector = () => {
    inputRef.current?.click();
  };

  const manejarDrop = (event) => {
    event.preventDefault();
    setArrastrando(false);
    agregarArchivos(event.dataTransfer.files);
  };

  const eliminarImagen = (imagenId) => {
    setImagenes((actuales) => {
      const imagen = actuales.find((item) => item.id === imagenId);

      if (imagen) {
        URL.revokeObjectURL(imagen.previewUrl);
      }

      const siguientes = actuales.filter((item) => item.id !== imagenId);

      if (principalId === imagenId) {
        setPrincipalId(siguientes[0]?.id || '');
      }

      return siguientes;
    });
  };

  const actualizarOrden = (imagenId, value) => {
    setImagenes((actuales) =>
      actuales.map((imagen) =>
        imagen.id === imagenId
          ? { ...imagen, orden: value }
          : imagen
      )
    );
  };

  const subirImagenes = async () => {
    if (!inmuebleId) {
      setError('No se recibio el identificador del inmueble.');
      return;
    }

    if (imagenes.length === 0) {
      setError('Agrega al menos una imagen.');
      return;
    }

    setSubiendo(true);
    setError('');
    setMensaje('');

    try {
      for (const imagen of imagenes) {
        await subirImagenInmueble(inmuebleId, imagen.file, {
          esPrincipal: imagen.id === principalId,
          orden: imagen.orden,
        });
      }

      setMensaje('Imagenes subidas correctamente.');
      imagenes.forEach((imagen) => URL.revokeObjectURL(imagen.previewUrl));
      setImagenes([]);
      setPrincipalId('');
      await cargarImagenesExistentes();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubiendo(false);
    }
  };

  const marcarPrincipal = async (imagenId) => {
    setAccionandoId(imagenId);
    setError('');
    setMensaje('');

    try {
      await marcarImagenPrincipal(inmuebleId, imagenId);
      setMensaje('Imagen principal actualizada.');
      await cargarImagenesExistentes();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionandoId('');
    }
  };

  const guardarOrden = async (imagenId, orden) => {
    setAccionandoId(imagenId);
    setError('');
    setMensaje('');

    try {
      await actualizarOrdenImagen(inmuebleId, imagenId, orden);
      setMensaje('Orden actualizado.');
      await cargarImagenesExistentes();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionandoId('');
    }
  };

  const cambiarOrdenExistente = (imagenId, orden) => {
    setImagenesExistentes((actuales) =>
      actuales.map((imagen) =>
        imagen.id === imagenId
          ? { ...imagen, orden }
          : imagen
      )
    );
  };

  const eliminarExistente = async (imagenId) => {
    if (!window.confirm('Eliminar esta imagen?')) {
      return;
    }

    setAccionandoId(imagenId);
    setError('');
    setMensaje('');

    try {
      await eliminarImagenInmueble(inmuebleId, imagenId);
      setMensaje('Imagen eliminada.');
      await cargarImagenesExistentes();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionandoId('');
    }
  };

  return (
    <main className="admin-imagenes">
      <section className="admin-imagenes-hero">
        <div>
          <p className="admin-imagenes-eyebrow">Administracion</p>
          <h1>Imagenes del inmueble {inmuebleId || 'sin identificar'}</h1>
        </div>
        <div className="admin-imagenes-actions-top">
          {inmuebleId ? (
            <Link to={`/admin/inmuebles/editar/${inmuebleId}`}>Editar inmueble</Link>
          ) : null}
          <Link to="/admin/propiedades">Volver al listado</Link>
        </div>
      </section>

      {mensaje ? <p className="admin-imagenes-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="admin-imagenes-feedback is-error">{error}</p> : null}

      <section
        className={`admin-imagenes-dropzone ${arrastrando ? 'is-dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={manejarDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => {
            agregarArchivos(event.target.files);
            event.target.value = '';
          }}
          hidden
        />
        <strong>Arrastra imagenes aqui</strong>
        <p>JPG, PNG o WEBP. Puedes seleccionar varias imagenes.</p>
        <button type="button" onClick={abrirSelector} disabled={subiendo}>
          Seleccionar archivos
        </button>
      </section>

      <section className="admin-imagenes-existentes">
        <div className="admin-imagenes-preview-head">
          <h2>Imagenes actuales</h2>
          <button type="button" onClick={() => cargarImagenesExistentes()} disabled={cargandoExistentes}>
            {cargandoExistentes ? 'Cargando...' : 'Refrescar'}
          </button>
        </div>

        {cargandoExistentes ? (
          <p className="admin-imagenes-empty">Cargando imagenes actuales...</p>
        ) : imagenesExistentes.length === 0 ? (
          <p className="admin-imagenes-empty">Este inmueble aun no tiene imagenes guardadas.</p>
        ) : (
          <div className="admin-imagenes-grid">
            {imagenesExistentes.map((imagen) => (
              <article key={imagen.id} className="admin-imagenes-card">
                <div className="admin-imagenes-img-wrap">
                  <img src={imagen.url} alt="" />
                  {imagen.esPrincipal ? <span>Principal</span> : null}
                </div>
                <div className="admin-imagenes-card-body">
                  <strong>{imagen.nombre}</strong>
                  <label>
                    <span>Orden</span>
                    <input
                      type="number"
                      min="0"
                      value={imagen.orden}
                      onChange={(event) => cambiarOrdenExistente(imagen.id, event.target.value)}
                    />
                  </label>
                  <div className="admin-imagenes-card-actions">
                    <button
                      type="button"
                      onClick={() => guardarOrden(imagen.id, imagen.orden)}
                      disabled={accionandoId === imagen.id}
                    >
                      Guardar orden
                    </button>
                    <button
                      type="button"
                      onClick={() => marcarPrincipal(imagen.id)}
                      disabled={accionandoId === imagen.id || imagen.esPrincipal}
                    >
                      Marcar principal
                    </button>
                    <button
                      type="button"
                      className="is-danger"
                      onClick={() => eliminarExistente(imagen.id)}
                      disabled={accionandoId === imagen.id}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {imagenes.length > 0 ? (
        <section className="admin-imagenes-preview">
          <div className="admin-imagenes-preview-head">
            <h2>Previsualizacion</h2>
            <button type="button" onClick={subirImagenes} disabled={subiendo}>
              {subiendo ? 'Subiendo...' : 'Subir imagenes'}
            </button>
          </div>

          <div className="admin-imagenes-grid">
            {imagenes.map((imagen) => (
              <article key={imagen.id} className="admin-imagenes-card">
                <img src={imagen.previewUrl} alt="" />
                <div className="admin-imagenes-card-body">
                  <strong>{imagen.nombre}</strong>
                  <label>
                    <span>Orden</span>
                    <input
                      type="number"
                      min="0"
                      value={imagen.orden}
                      onChange={(event) => actualizarOrden(imagen.id, event.target.value)}
                    />
                  </label>
                  <label className="admin-imagenes-check">
                    <input
                      type="radio"
                      name="principal"
                      checked={principalId === imagen.id}
                      onChange={() => setPrincipalId(imagen.id)}
                    />
                    <span>Imagen principal</span>
                  </label>
                  <button type="button" onClick={() => eliminarImagen(imagen.id)} disabled={subiendo}>
                    Quitar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <p className="admin-imagenes-empty">Aun no has seleccionado imagenes.</p>
      )}
    </main>
  );
}
