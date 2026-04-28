import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Tour360Viewer from '../components/Tour360Viewer';
import {
  actualizarEscena360,
  actualizarHotspot360,
  actualizarTour360,
  crearHotspot360,
  crearTour360,
  eliminarEscena360,
  eliminarHotspot360,
  establecerEscenaInicial360,
  obtenerTour360PorInmueble,
  subirEscena360,
} from '../services/tours360Service';
import './AdminTour360Page.css';

const TOUR_INICIAL = {
  titulo: 'Tour 360',
  descripcion: '',
  activo: true,
};

const ESCENA_INICIAL = {
  nombre: '',
  urlImagen360: '',
  orden: 0,
  pitchInicial: 0,
  yawInicial: 0,
  hfovInicial: 110,
  esEscenaInicial: false,
  activo: true,
};

const HOTSPOT_INICIAL = {
  tipo: 'INFO',
  etiqueta: '',
  pitch: 0,
  yaw: 0,
  icono: '',
  escenaDestinoId: '',
  activo: true,
};

const toFormString = (value) => (value === null || value === undefined ? '' : String(value));

const buildTourForm = (tour) => ({
  titulo: tour?.titulo || tour?.nombre || TOUR_INICIAL.titulo,
  descripcion: tour?.descripcion || '',
  activo: tour?.activo !== false,
});

const buildEscenaForm = (escena = {}) => ({
  nombre: escena.nombre || '',
  urlImagen360: escena.urlImagen360Original || escena.urlImagen360 || '',
  orden: toFormString(escena.orden ?? 0),
  pitchInicial: toFormString(escena.pitchInicial ?? 0),
  yawInicial: toFormString(escena.yawInicial ?? 0),
  hfovInicial: toFormString(escena.hfovInicial ?? 110),
  esEscenaInicial: escena.esEscenaInicial === true,
  activo: escena.activo !== false,
});

const buildHotspotForm = (hotspot = {}) => ({
  tipo: hotspot.tipo === 'SCENE' ? 'NAVEGACION' : hotspot.tipo || 'INFO',
  etiqueta: hotspot.etiqueta || hotspot.texto || '',
  pitch: toFormString(hotspot.pitch ?? 0),
  yaw: toFormString(hotspot.yaw ?? 0),
  icono: hotspot.icono || '',
  escenaDestinoId: hotspot.escenaDestinoId || '',
  activo: hotspot.activo !== false,
});

function Field({ children, help, label }) {
  return (
    <label className="admin-tour360-field">
      <span className="admin-tour360-label">
        {label}
        {help ? (
          <span className="admin-tour360-help" tabIndex="0" aria-label={help}>
            ?
            <span className="admin-tour360-tooltip" role="tooltip">{help}</span>
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

export default function AdminTour360Page() {
  const { inmuebleId } = useParams();
  const [tour, setTour] = useState(null);
  const [tourForm, setTourForm] = useState(TOUR_INICIAL);
  const [escenaForm, setEscenaForm] = useState(ESCENA_INICIAL);
  const [escenaArchivo, setEscenaArchivo] = useState(null);
  const [escenaArchivoKey, setEscenaArchivoKey] = useState(0);
  const [hotspotForm, setHotspotForm] = useState(HOTSPOT_INICIAL);
  const [escenaSeleccionadaId, setEscenaSeleccionadaId] = useState('');
  const [escenaEditandoId, setEscenaEditandoId] = useState('');
  const [hotspotEditandoId, setHotspotEditandoId] = useState('');
  const [modoAgregarHotspot, setModoAgregarHotspot] = useState(false);
  const [hotspotTemporal, setHotspotTemporal] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const escenas = useMemo(() => tour?.escenas || [], [tour]);
  const escenaSeleccionada = escenas.find((escena) => escena.id === escenaSeleccionadaId) || escenas[0] || null;
  const hotspots = escenaSeleccionada?.hotspots || [];

  const cargarTour = useCallback(async () => {
    setCargando(true);
    setError('');

    try {
      const data = await obtenerTour360PorInmueble(inmuebleId);
      setTour(data);
      setTourForm(buildTourForm(data));
      setEscenaSeleccionadaId((actual) => {
        if (data?.escenas?.some((escena) => escena.id === actual)) {
          return actual;
        }

        return data?.escenaInicialId || data?.escenas?.[0]?.id || '';
      });
    } catch (err) {
      setError(err.message || 'No fue posible cargar el tour.');
    } finally {
      setCargando(false);
    }
  }, [inmuebleId]);

  useEffect(() => {
    cargarTour();
  }, [cargarTour]);

  const ejecutarAccion = async (accion, mensajeExito) => {
    setGuardando(true);
    setMensaje('');
    setError('');

    try {
      await accion();
      setMensaje(mensajeExito);
      await cargarTour();
    } catch (err) {
      setError(err.message || 'No fue posible guardar los cambios.');
    } finally {
      setGuardando(false);
    }
  };

  const actualizarCampoTour = (event) => {
    const { checked, name, type, value } = event.target;
    setTourForm((actual) => ({
      ...actual,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const actualizarCampoEscena = (event) => {
    const { checked, name, type, value } = event.target;
    setEscenaForm((actual) => ({
      ...actual,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const actualizarArchivoEscena = (event) => {
    setEscenaArchivo(event.target.files?.[0] || null);
  };

  const actualizarCampoHotspot = (event) => {
    const { checked, name, type, value } = event.target;
    setHotspotForm((actual) => ({
      ...actual,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const guardarTour = (event) => {
    event.preventDefault();

    ejecutarAccion(async () => {
      if (tour?.id) {
        await actualizarTour360(tour.id, {
          ...tourForm,
          inmuebleId,
        });
        return;
      }

      await crearTour360({
        ...tourForm,
        inmuebleId,
      });
    }, tour?.id ? 'Tour actualizado.' : 'Tour creado.');
  };

  const guardarEscena = (event) => {
    event.preventDefault();

    if (!tour?.id) {
      setError('Primero crea el tour.');
      return;
    }

    if (!escenaEditandoId && !escenaArchivo) {
      setError('Selecciona una imagen 360 para crear la escena.');
      return;
    }

    ejecutarAccion(async () => {
      if (escenaEditandoId) {
        await actualizarEscena360(escenaEditandoId, escenaForm);
      } else {
        await subirEscena360(tour.id, {
          ...escenaForm,
          archivo: escenaArchivo,
        });
      }

      if (escenaForm.esEscenaInicial && escenaEditandoId) {
        await establecerEscenaInicial360(tour.id, escenaEditandoId);
      }
    }, escenaEditandoId ? 'Escena actualizada.' : 'Escena agregada.');

    setEscenaForm(ESCENA_INICIAL);
    setEscenaArchivo(null);
    setEscenaArchivoKey((actual) => actual + 1);
    setEscenaEditandoId('');
  };

  const editarEscena = (escena) => {
    setEscenaEditandoId(escena.id);
    setEscenaForm(buildEscenaForm(escena));
    setEscenaArchivo(null);
    setEscenaArchivoKey((actual) => actual + 1);
    setEscenaSeleccionadaId(escena.id);
  };

  const desactivarEscena = (escena) => {
    ejecutarAccion(
      () => actualizarEscena360(escena.id, { ...buildEscenaForm(escena), activo: false }),
      'Escena desactivada.'
    );
  };

  const eliminarEscena = (escena) => {
    ejecutarAccion(() => eliminarEscena360(escena.id), 'Escena eliminada.');
  };

  const marcarEscenaInicial = (escena) => {
    if (!tour?.id) {
      return;
    }

    ejecutarAccion(
      () => establecerEscenaInicial360(tour.id, escena.id),
      'Escena inicial actualizada.'
    );
  };

  const guardarHotspot = (event) => {
    event.preventDefault();

    if (!escenaSeleccionada?.id) {
      setError('Selecciona una escena para agregar hotspots.');
      return;
    }

    ejecutarAccion(async () => {
      if (hotspotEditandoId) {
        await actualizarHotspot360(hotspotEditandoId, hotspotForm);
      } else {
        await crearHotspot360(escenaSeleccionada.id, hotspotForm);
      }
    }, hotspotEditandoId ? 'Hotspot actualizado.' : 'Hotspot agregado.');

    setHotspotForm(HOTSPOT_INICIAL);
    setHotspotEditandoId('');
    setModoAgregarHotspot(false);
    setHotspotTemporal(null);
  };

  const editarHotspot = (hotspot) => {
    setHotspotEditandoId(hotspot.id);
    setHotspotForm(buildHotspotForm(hotspot));
    setModoAgregarHotspot(false);
    setHotspotTemporal(null);
  };

  const desactivarHotspot = (hotspot) => {
    ejecutarAccion(
      () => actualizarHotspot360(hotspot.id, { ...buildHotspotForm(hotspot), activo: false }),
      'Hotspot desactivado.'
    );
  };

  const eliminarHotspot = (hotspot) => {
    ejecutarAccion(() => eliminarHotspot360(hotspot.id), 'Hotspot eliminado.');
  };

  const activarModoAgregarHotspot = () => {
    if (!escenaSeleccionada?.id) {
      setError('Selecciona una escena antes de colocar un hotspot.');
      return;
    }

    setError('');
    setMensaje('');
    setHotspotEditandoId('');
    setHotspotForm({
      ...HOTSPOT_INICIAL,
      pitch: '',
      yaw: '',
    });
    setHotspotTemporal(null);
    setModoAgregarHotspot(true);
  };

  const cancelarModoAgregarHotspot = () => {
    setModoAgregarHotspot(false);
    setHotspotTemporal(null);
  };

  const capturarHotspotDesdePreview = ({ pitch, sceneId, yaw }) => {
    setEscenaSeleccionadaId(sceneId);
    setHotspotEditandoId('');
    setHotspotTemporal({ pitch, sceneId, yaw });
    setHotspotForm((actual) => ({
      ...actual,
      pitch: toFormString(pitch),
      yaw: toFormString(yaw),
    }));
    setMensaje('Coordenadas capturadas. Completa los datos del hotspot y guarda.');
  };

  return (
    <main className="admin-tour360">
      <section className="admin-tour360-hero">
        <div>
          <p className="admin-tour360-eyebrow">Administracion</p>
          <h1>Tour 360 del inmueble {inmuebleId}</h1>
        </div>
        <button type="button" className="admin-tour360-secondary" onClick={cargarTour} disabled={cargando || guardando}>
          Recargar
        </button>
      </section>

      {mensaje ? <p className="admin-tour360-alert admin-tour360-alert-ok">{mensaje}</p> : null}
      {error ? <p className="admin-tour360-alert admin-tour360-alert-error">{error}</p> : null}

      {cargando ? (
        <p className="admin-tour360-loading">Cargando tour...</p>
      ) : (
        <>
          <section className="admin-tour360-card">
            <div className="admin-tour360-card-head">
              <h2>{tour?.id ? 'Datos del tour' : 'Crear tour'}</h2>
              {tour?.id ? <span className="admin-tour360-pill">ID {tour.id}</span> : null}
            </div>
            <form className="admin-tour360-form" onSubmit={guardarTour}>
              <Field label="Titulo">
                <input name="titulo" value={tourForm.titulo} onChange={actualizarCampoTour} required />
              </Field>
              <Field label="Descripcion">
                <textarea name="descripcion" value={tourForm.descripcion} onChange={actualizarCampoTour} rows="3" />
              </Field>
              <label className="admin-tour360-check">
                <input name="activo" type="checkbox" checked={tourForm.activo} onChange={actualizarCampoTour} />
                <span>Tour activo</span>
              </label>
              <button type="submit" className="admin-tour360-primary" disabled={guardando}>
                {tour?.id ? 'Guardar tour' : 'Crear tour'}
              </button>
            </form>
          </section>

          <div className="admin-tour360-grid">
            <section className="admin-tour360-card">
              <div className="admin-tour360-card-head">
                <h2>Escenas</h2>
                <span className="admin-tour360-pill">{escenas.length}</span>
              </div>

              <div className="admin-tour360-list">
                {escenas.length === 0 ? (
                  <p className="admin-tour360-empty">Aun no hay escenas.</p>
                ) : (
                  escenas.map((escena) => (
                    <article
                      key={escena.id}
                      className={`admin-tour360-list-item ${escenaSeleccionada?.id === escena.id ? 'is-selected' : ''}`}
                    >
                      <button type="button" onClick={() => setEscenaSeleccionadaId(escena.id)}>
                        <strong>{escena.nombre}</strong>
                        <span>Orden {escena.orden ?? 0}</span>
                      </button>
                      <div className="admin-tour360-item-actions">
                        {escena.esEscenaInicial ? <span className="admin-tour360-pill">Inicial</span> : null}
                        {!escena.activo ? <span className="admin-tour360-pill muted">Inactiva</span> : null}
                        <button type="button" onClick={() => marcarEscenaInicial(escena)} disabled={guardando}>
                          Inicial
                        </button>
                        <button type="button" onClick={() => editarEscena(escena)} disabled={guardando}>
                          Editar
                        </button>
                        <button type="button" onClick={() => desactivarEscena(escena)} disabled={guardando || !escena.activo}>
                          Desactivar
                        </button>
                        <button type="button" className="danger" onClick={() => eliminarEscena(escena)} disabled={guardando}>
                          Eliminar
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="admin-tour360-card">
              <h2>{escenaEditandoId ? 'Editar escena' : 'Agregar escena'}</h2>
              <form className="admin-tour360-form compact" onSubmit={guardarEscena}>
                <Field label="Nombre">
                  <input name="nombre" value={escenaForm.nombre} onChange={actualizarCampoEscena} required />
                </Field>
                {escenaEditandoId ? (
                  <Field label="URL imagen 360">
                    <input name="urlImagen360" value={escenaForm.urlImagen360} onChange={actualizarCampoEscena} required />
                  </Field>
                ) : (
                  <Field label="Imagen 360">
                    <input key={escenaArchivoKey} type="file" accept="image/*" onChange={actualizarArchivoEscena} required />
                  </Field>
                )}
                <div className="admin-tour360-row">
                  <Field label="Orden">
                    <input name="orden" type="number" value={escenaForm.orden} onChange={actualizarCampoEscena} />
                  </Field>
                  <Field
                    help="Ángulo vertical inicial. 0 mira al frente, positivo mira hacia arriba y negativo hacia abajo."
                    label="Pitch inicial"
                  >
                    <input name="pitchInicial" type="number" step="0.01" value={escenaForm.pitchInicial} onChange={actualizarCampoEscena} />
                  </Field>
                  <Field
                    help="Ángulo horizontal inicial. Define hacia dónde empieza mirando el recorrido."
                    label="Yaw inicial"
                  >
                    <input name="yawInicial" type="number" step="0.01" value={escenaForm.yawInicial} onChange={actualizarCampoEscena} />
                  </Field>
                  <Field
                    help="Campo de visión inicial. Más alto se ve más abierto; más bajo se ve más acercado. Recomendado: 100 a 110."
                    label="HFOV inicial"
                  >
                    <input name="hfovInicial" type="number" step="0.01" value={escenaForm.hfovInicial} onChange={actualizarCampoEscena} />
                  </Field>
                </div>
                <div className="admin-tour360-checks">
                  <label className="admin-tour360-check">
                    <input name="esEscenaInicial" type="checkbox" checked={escenaForm.esEscenaInicial} onChange={actualizarCampoEscena} />
                    <span>Escena inicial</span>
                  </label>
                  <label className="admin-tour360-check">
                    <input name="activo" type="checkbox" checked={escenaForm.activo} onChange={actualizarCampoEscena} />
                    <span>Activa</span>
                  </label>
                </div>
                <div className="admin-tour360-actions">
                  <button type="submit" className="admin-tour360-primary" disabled={guardando || !tour?.id}>
                    {escenaEditandoId ? 'Guardar escena' : 'Agregar escena'}
                  </button>
                  {escenaEditandoId ? (
                    <button
                      type="button"
                      className="admin-tour360-secondary"
                      onClick={() => {
                        setEscenaEditandoId('');
                        setEscenaForm(ESCENA_INICIAL);
                        setEscenaArchivo(null);
                        setEscenaArchivoKey((actual) => actual + 1);
                      }}
                    >
                      Cancelar
                    </button>
                  ) : null}
                </div>
              </form>
            </section>
          </div>

          <div className="admin-tour360-grid">
            <section className="admin-tour360-card">
              <div className="admin-tour360-card-head">
                <h2>Hotspots {escenaSeleccionada ? `de ${escenaSeleccionada.nombre}` : ''}</h2>
                <span className="admin-tour360-pill">{hotspots.length}</span>
              </div>
              <div className="admin-tour360-visual-tools">
                <button
                  type="button"
                  className="admin-tour360-primary"
                  onClick={activarModoAgregarHotspot}
                  disabled={guardando || !escenaSeleccionada}
                >
                  Agregar hotspot visual
                </button>
                {modoAgregarHotspot ? (
                  <button type="button" className="admin-tour360-secondary" onClick={cancelarModoAgregarHotspot}>
                    Cancelar modo
                  </button>
                ) : null}
              </div>
              {modoAgregarHotspot ? (
                <p className="admin-tour360-helper">
                  Haz clic en la escena del preview para colocar el hotspot. Despues completa etiqueta, tipo e icono.
                </p>
              ) : null}
              <div className="admin-tour360-list">
                {!escenaSeleccionada ? (
                  <p className="admin-tour360-empty">Selecciona una escena.</p>
                ) : hotspots.length === 0 ? (
                  <p className="admin-tour360-empty">Esta escena aun no tiene hotspots.</p>
                ) : (
                  hotspots.map((hotspot) => (
                    <article key={hotspot.id} className="admin-tour360-list-item">
                      <div>
                        <strong>{hotspot.etiqueta || hotspot.texto || 'Hotspot'}</strong>
                        <span>{hotspot.tipo} · pitch {hotspot.pitch} · yaw {hotspot.yaw}</span>
                      </div>
                      <div className="admin-tour360-item-actions">
                        {!hotspot.activo ? <span className="admin-tour360-pill muted">Inactivo</span> : null}
                        <button type="button" onClick={() => editarHotspot(hotspot)} disabled={guardando}>
                          Editar
                        </button>
                        <button type="button" onClick={() => desactivarHotspot(hotspot)} disabled={guardando || !hotspot.activo}>
                          Desactivar
                        </button>
                        <button type="button" className="danger" onClick={() => eliminarHotspot(hotspot)} disabled={guardando}>
                          Eliminar
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="admin-tour360-card">
              <h2>{hotspotEditandoId ? 'Editar hotspot' : 'Agregar hotspot'}</h2>
              <form className="admin-tour360-form compact" onSubmit={guardarHotspot}>
                <div className="admin-tour360-row two">
                  <Field label="Tipo">
                    <select name="tipo" value={hotspotForm.tipo} onChange={actualizarCampoHotspot}>
                      <option value="INFO">INFO</option>
                      <option value="NAVEGACION">NAVEGACION</option>
                    </select>
                  </Field>
                  <Field label="Etiqueta">
                    <input name="etiqueta" value={hotspotForm.etiqueta} onChange={actualizarCampoHotspot} required />
                  </Field>
                  <Field label="Pitch">
                    <input name="pitch" type="number" step="0.01" value={hotspotForm.pitch} onChange={actualizarCampoHotspot} />
                  </Field>
                  <Field label="Yaw">
                    <input name="yaw" type="number" step="0.01" value={hotspotForm.yaw} onChange={actualizarCampoHotspot} />
                  </Field>
                  <Field label="Icono">
                    <input name="icono" value={hotspotForm.icono} onChange={actualizarCampoHotspot} />
                  </Field>
                  <Field label="Escena destino">
                    <select
                      name="escenaDestinoId"
                      value={hotspotForm.escenaDestinoId}
                      onChange={actualizarCampoHotspot}
                      disabled={hotspotForm.tipo !== 'NAVEGACION'}
                    >
                      <option value="">Sin destino</option>
                      {escenas
                        .filter((escena) => escena.id !== escenaSeleccionada?.id)
                        .map((escena) => (
                          <option key={escena.id} value={escena.id}>
                            {escena.nombre}
                          </option>
                        ))}
                    </select>
                  </Field>
                </div>
                <label className="admin-tour360-check">
                  <input name="activo" type="checkbox" checked={hotspotForm.activo} onChange={actualizarCampoHotspot} />
                  <span>Hotspot activo</span>
                </label>
                <div className="admin-tour360-actions">
                  <button type="submit" className="admin-tour360-primary" disabled={guardando || !escenaSeleccionada}>
                    {hotspotEditandoId ? 'Guardar hotspot' : 'Agregar hotspot'}
                  </button>
                  {hotspotEditandoId ? (
                    <button
                      type="button"
                      className="admin-tour360-secondary"
                      onClick={() => {
                        setHotspotEditandoId('');
                        setHotspotForm(HOTSPOT_INICIAL);
                        setHotspotTemporal(null);
                      }}
                    >
                      Cancelar
                    </button>
                  ) : null}
                </div>
              </form>
            </section>
          </div>

          <section className="admin-tour360-preview">
            <div className="admin-tour360-card-head">
              <h2>Preview</h2>
              {modoAgregarHotspot ? <span className="admin-tour360-pill">Modo agregar hotspot</span> : null}
            </div>
            {tour?.escenas?.length ? (
              <Tour360Viewer
                editorMarker={hotspotTemporal}
                editorMode={modoAgregarHotspot}
                onPanoramaClick={capturarHotspotDesdePreview}
                tour={tour}
              />
            ) : (
              <p className="admin-tour360-empty">Agrega al menos una escena para previsualizar el tour.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
