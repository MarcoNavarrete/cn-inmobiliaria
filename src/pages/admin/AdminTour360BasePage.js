import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Tour360Viewer from '../../components/Tour360Viewer';
import {
  actualizarEscena,
  actualizarHotspot,
  crearEscena,
  crearHotspot,
  eliminarEscena,
  eliminarHotspot,
  subirImagenEscena,
} from '../../services/tour360Service';
import '../AdminTour360Page.css';

const TOUR_INICIAL = { titulo: 'Tour 360', descripcion: '', activo: true };
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
  escenaDestinoId: '',
  pitch: 0,
  yaw: 0,
  icono: '',
  activo: true,
};

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible guardar los cambios.';

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
  tipo: hotspot.tipo === 'NAVEGACION' ? 'LINK_ESCENA' : hotspot.tipo || 'INFO',
  etiqueta: hotspot.etiqueta || hotspot.texto || '',
  escenaDestinoId: hotspot.escenaDestinoId || '',
  pitch: toFormString(hotspot.pitch ?? 0),
  yaw: toFormString(hotspot.yaw ?? 0),
  icono: hotspot.icono || '',
  activo: hotspot.activo !== false,
});

function Field({ children, label }) {
  return (
    <label className="admin-tour360-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function AdminTour360BasePage({
  backTo,
  entityId,
  obtenerTour,
  guardarTour,
  title,
}) {
  const [tour, setTour] = useState(null);
  const [tourForm, setTourForm] = useState(TOUR_INICIAL);
  const [escenaForm, setEscenaForm] = useState(ESCENA_INICIAL);
  const [escenaArchivo, setEscenaArchivo] = useState(null);
  const [escenaEditandoId, setEscenaEditandoId] = useState('');
  const [hotspotForm, setHotspotForm] = useState(HOTSPOT_INICIAL);
  const [hotspotEditandoId, setHotspotEditandoId] = useState('');
  const [escenaSeleccionadaId, setEscenaSeleccionadaId] = useState('');
  const [hotspotTemporal, setHotspotTemporal] = useState(null);
  const [viewerApi, setViewerApi] = useState(null);
  const [posicionMensaje, setPosicionMensaje] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const escenas = useMemo(() => tour?.escenas || [], [tour]);
  const escenaSeleccionada = escenas.find((escena) => escena.id === escenaSeleccionadaId) || escenas[0] || null;
  const hotspots = escenaSeleccionada?.hotspots || [];
  const tourPreviewEscena = useMemo(
    () =>
      escenaSeleccionada
        ? {
            ...tour,
            escenaInicialId: escenaSeleccionada.id,
            escenas: [escenaSeleccionada],
          }
        : null,
    [escenaSeleccionada, tour]
  );

  const cargarTour = useCallback(async () => {
    setCargando(true);
    setError('');

    try {
      const data = await obtenerTour(entityId);
      setTour(data);
      setTourForm(buildTourForm(data));
      setEscenaSeleccionadaId(data?.escenaInicialId || data?.escenas?.[0]?.id || '');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setCargando(false);
    }
  }, [entityId, obtenerTour]);

  useEffect(() => {
    cargarTour();
  }, [cargarTour]);

  const ejecutar = async (accion, ok) => {
    setGuardando(true);
    setMensaje('');
    setError('');

    try {
      await accion();
      setMensaje(ok);
      await cargarTour();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  const actualizarCampo = (setter) => (event) => {
    const { checked, name, type, value } = event.target;
    setter((actual) => ({ ...actual, [name]: type === 'checkbox' ? checked : value }));
  };

  const guardarDatosTour = (event) => {
    event.preventDefault();
    ejecutar(() => guardarTour(entityId, tourForm), tour?.id ? 'Tour actualizado.' : 'Tour creado.');
  };

  const guardarEscena = (event) => {
    event.preventDefault();

    if (!tour?.id) {
      setError('Primero crea el tour.');
      return;
    }

    if (!escenaEditandoId && !escenaArchivo && !escenaForm.urlImagen360) {
      setError('Selecciona o sube una imagen 360.');
      return;
    }

    ejecutar(async () => {
      if (escenaEditandoId) {
        await actualizarEscena(escenaEditandoId, escenaForm);
        return;
      }

      let urlImagen360 = escenaForm.urlImagen360;
      if (escenaArchivo) {
        const upload = await subirImagenEscena(escenaArchivo);
        urlImagen360 = upload?.url || upload?.Url || upload?.ruta || '';
      }

      await crearEscena(tour.id, { ...escenaForm, urlImagen360 });
    }, escenaEditandoId ? 'Escena actualizada.' : 'Escena agregada.');

    setEscenaForm(ESCENA_INICIAL);
    setEscenaArchivo(null);
    setEscenaEditandoId('');
  };

  const guardarHotspot = (event) => {
    event.preventDefault();

    if (!escenaSeleccionada?.id) {
      setError('Selecciona una escena.');
      return;
    }

    if (hotspotForm.pitch === '' || hotspotForm.pitch === null || hotspotForm.pitch === undefined) {
      setError('Pitch es requerido.');
      return;
    }

    if (hotspotForm.yaw === '' || hotspotForm.yaw === null || hotspotForm.yaw === undefined) {
      setError('Yaw es requerido.');
      return;
    }

    if (hotspotForm.tipo === 'LINK_ESCENA' && !hotspotForm.escenaDestinoId) {
      setError('Selecciona una escena destino para LINK_ESCENA.');
      return;
    }

    if (hotspotForm.tipo === 'INFO' && !String(hotspotForm.etiqueta || '').trim()) {
      setError('La etiqueta es requerida para INFO.');
      return;
    }

    ejecutar(async () => {
      if (hotspotEditandoId) {
        await actualizarHotspot(hotspotEditandoId, hotspotForm);
      } else {
        await crearHotspot(escenaSeleccionada.id, hotspotForm);
      }
    }, hotspotEditandoId ? 'Hotspot actualizado.' : 'Hotspot agregado.');

    setHotspotForm(HOTSPOT_INICIAL);
    setHotspotEditandoId('');
    setHotspotTemporal(null);
    setPosicionMensaje('');
  };

  const seleccionarHotspotDesdePreview = useCallback(({ pitch, sceneId, yaw }) => {
    const pitchRedondeado = Number(pitch).toFixed(6);
    const yawRedondeado = Number(yaw).toFixed(6);

    setEscenaSeleccionadaId(sceneId);
    setHotspotTemporal({
      pitch: Number(pitchRedondeado),
      yaw: Number(yawRedondeado),
      sceneId,
    });
    setHotspotForm((actual) => ({
      ...actual,
      pitch: pitchRedondeado,
      yaw: yawRedondeado,
    }));
    setPosicionMensaje(`Posicion seleccionada: pitch ${pitchRedondeado}, yaw ${yawRedondeado}`);
  }, []);

  const usarPosicionActual = () => {
    if (!viewerApi?.getPitch || !viewerApi?.getYaw || !escenaSeleccionada?.id) {
      setError('El visor aun no esta listo para obtener la posicion actual.');
      return;
    }

    seleccionarHotspotDesdePreview({
      pitch: viewerApi.getPitch(),
      yaw: viewerApi.getYaw(),
      sceneId: escenaSeleccionada.id,
    });
  };

  const editarHotspot = (hotspot) => {
    setHotspotEditandoId(hotspot.id);
    setHotspotForm(buildHotspotForm(hotspot));
    setHotspotTemporal({
      pitch: Number(hotspot.pitch),
      yaw: Number(hotspot.yaw),
      sceneId: escenaSeleccionada?.id,
    });
    setPosicionMensaje('');
  };

  const cancelarHotspot = () => {
    setHotspotEditandoId('');
    setHotspotForm(HOTSPOT_INICIAL);
    setHotspotTemporal(null);
    setPosicionMensaje('');
  };

  return (
    <main className="admin-tour360">
      <section className="admin-tour360-hero">
        <div>
          <p className="admin-tour360-eyebrow">Administracion</p>
          <h1>{title}</h1>
        </div>
        <div className="admin-tour360-actions">
          <Link className="admin-tour360-secondary" to={backTo}>Volver</Link>
          <button type="button" className="admin-tour360-secondary" onClick={cargarTour} disabled={cargando || guardando}>Recargar</button>
        </div>
      </section>

      {mensaje ? <p className="admin-tour360-alert admin-tour360-alert-ok">{mensaje}</p> : null}
      {error ? <p className="admin-tour360-alert admin-tour360-alert-error">{error}</p> : null}

      {cargando ? <p className="admin-tour360-loading">Cargando tour...</p> : (
        <>
          <section className="admin-tour360-card">
            <div className="admin-tour360-card-head">
              <h2>{tour?.id ? 'Datos del tour' : 'Crear tour'}</h2>
              {tour?.id ? <span className="admin-tour360-pill">ID {tour.id}</span> : null}
            </div>
            <form className="admin-tour360-form" onSubmit={guardarDatosTour}>
              <Field label="Titulo">
                <input name="titulo" value={tourForm.titulo} onChange={actualizarCampo(setTourForm)} required />
              </Field>
              <Field label="Descripcion">
                <textarea name="descripcion" value={tourForm.descripcion} onChange={actualizarCampo(setTourForm)} rows="3" />
              </Field>
              <label className="admin-tour360-check">
                <input name="activo" type="checkbox" checked={tourForm.activo} onChange={actualizarCampo(setTourForm)} />
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
                {escenas.length === 0 ? <p className="admin-tour360-empty">Aun no hay escenas.</p> : escenas.map((escena) => (
                  <article key={escena.id} className={`admin-tour360-list-item ${escenaSeleccionada?.id === escena.id ? 'is-selected' : ''}`}>
                    <button type="button" onClick={() => setEscenaSeleccionadaId(escena.id)}>
                      <strong>{escena.nombre}</strong>
                      <span>Orden {escena.orden ?? 0}</span>
                    </button>
                    <div className="admin-tour360-item-actions">
                      {escena.esEscenaInicial ? <span className="admin-tour360-pill">Inicial</span> : null}
                      <button type="button" onClick={() => { setEscenaEditandoId(escena.id); setEscenaForm(buildEscenaForm(escena)); }}>Editar</button>
                      <button type="button" className="danger" onClick={() => ejecutar(() => eliminarEscena(escena.id), 'Escena eliminada.')} disabled={guardando}>Eliminar</button>
                      <button type="button" onClick={() => setEscenaSeleccionadaId(escena.id)}>
                        Editar hotspots
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="admin-tour360-card">
              <h2>{escenaEditandoId ? 'Editar escena' : 'Agregar escena'}</h2>
              <form className="admin-tour360-form compact" onSubmit={guardarEscena}>
                <Field label="Nombre"><input name="nombre" value={escenaForm.nombre} onChange={actualizarCampo(setEscenaForm)} required /></Field>
                <Field label="Imagen 360">
                  <input type="file" accept="image/*" onChange={(event) => setEscenaArchivo(event.target.files?.[0] || null)} />
                </Field>
                <Field label="URL imagen 360">
                  <input name="urlImagen360" value={escenaForm.urlImagen360} onChange={actualizarCampo(setEscenaForm)} placeholder="Tambien puedes pegar una URL" />
                </Field>
                <div className="admin-tour360-row">
                  <Field label="Orden"><input name="orden" type="number" value={escenaForm.orden} onChange={actualizarCampo(setEscenaForm)} /></Field>
                  <Field label="Pitch inicial"><input name="pitchInicial" type="number" step="0.01" value={escenaForm.pitchInicial} onChange={actualizarCampo(setEscenaForm)} /></Field>
                  <Field label="Yaw inicial"><input name="yawInicial" type="number" step="0.01" value={escenaForm.yawInicial} onChange={actualizarCampo(setEscenaForm)} /></Field>
                  <Field label="HFOV inicial"><input name="hfovInicial" type="number" step="0.01" value={escenaForm.hfovInicial} onChange={actualizarCampo(setEscenaForm)} /></Field>
                </div>
                <div className="admin-tour360-checks">
                  <label className="admin-tour360-check"><input name="esEscenaInicial" type="checkbox" checked={escenaForm.esEscenaInicial} onChange={actualizarCampo(setEscenaForm)} /><span>Escena inicial</span></label>
                  <label className="admin-tour360-check"><input name="activo" type="checkbox" checked={escenaForm.activo} onChange={actualizarCampo(setEscenaForm)} /><span>Activa</span></label>
                </div>
                <div className="admin-tour360-actions">
                  <button type="submit" className="admin-tour360-primary" disabled={guardando || !tour?.id}>{escenaEditandoId ? 'Guardar escena' : 'Agregar escena'}</button>
                  {escenaEditandoId ? <button type="button" className="admin-tour360-secondary" onClick={() => { setEscenaEditandoId(''); setEscenaForm(ESCENA_INICIAL); }}>Cancelar</button> : null}
                </div>
              </form>
            </section>
          </div>

          <div className="admin-tour360-grid">
            <section className="admin-tour360-card">
              <div className="admin-tour360-card-head"><h2>Hotspots {escenaSeleccionada ? `de ${escenaSeleccionada.nombre}` : ''}</h2><span className="admin-tour360-pill">{hotspots.length}</span></div>
              <div className="admin-tour360-list">
                {!escenaSeleccionada ? <p className="admin-tour360-empty">Selecciona una escena.</p> : hotspots.length === 0 ? <p className="admin-tour360-empty">Esta escena aun no tiene hotspots.</p> : hotspots.map((hotspot) => (
                  <article key={hotspot.id} className="admin-tour360-list-item">
                    <div><strong>{hotspot.etiqueta || hotspot.texto}</strong><span>{hotspot.tipo} - pitch {hotspot.pitch} - yaw {hotspot.yaw}</span></div>
                    <div className="admin-tour360-item-actions">
                      <button type="button" onClick={() => editarHotspot(hotspot)}>Editar</button>
                      <button type="button" className="danger" onClick={() => ejecutar(() => eliminarHotspot(hotspot.id), 'Hotspot eliminado.')} disabled={guardando}>Eliminar</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="admin-tour360-card">
              <h2>{hotspotEditandoId ? 'Editar hotspot' : 'Agregar hotspot'}</h2>
              <form className="admin-tour360-form compact" onSubmit={guardarHotspot}>
                <div className="admin-tour360-row two">
                  <Field label="Tipo"><select name="tipo" value={hotspotForm.tipo} onChange={actualizarCampo(setHotspotForm)}><option value="INFO">INFO</option><option value="LINK_ESCENA">LINK_ESCENA</option></select></Field>
                  <Field label="Etiqueta"><input name="etiqueta" value={hotspotForm.etiqueta} onChange={actualizarCampo(setHotspotForm)} required /></Field>
                  <Field label="Pitch"><input name="pitch" type="number" step="0.01" value={hotspotForm.pitch} onChange={actualizarCampo(setHotspotForm)} /></Field>
                  <Field label="Yaw"><input name="yaw" type="number" step="0.01" value={hotspotForm.yaw} onChange={actualizarCampo(setHotspotForm)} /></Field>
                  <Field label="Icono"><input name="icono" value={hotspotForm.icono} onChange={actualizarCampo(setHotspotForm)} /></Field>
                  <Field label="Escena destino">
                    <select name="escenaDestinoId" value={hotspotForm.escenaDestinoId} onChange={actualizarCampo(setHotspotForm)} disabled={hotspotForm.tipo !== 'LINK_ESCENA'}>
                      <option value="">Sin destino</option>
                      {escenas.filter((escena) => escena.id !== escenaSeleccionada?.id).map((escena) => <option key={escena.id} value={escena.id}>{escena.nombre}</option>)}
                    </select>
                  </Field>
                </div>
                <label className="admin-tour360-check"><input name="activo" type="checkbox" checked={hotspotForm.activo} onChange={actualizarCampo(setHotspotForm)} /><span>Hotspot activo</span></label>
                <div className="admin-tour360-actions">
                  <button type="submit" className="admin-tour360-primary" disabled={guardando || !escenaSeleccionada}>{hotspotEditandoId ? 'Guardar hotspot' : 'Agregar hotspot'}</button>
                  {hotspotEditandoId ? <button type="button" className="admin-tour360-secondary" onClick={cancelarHotspot}>Cancelar</button> : null}
                </div>
              </form>
            </section>
          </div>

          <section className="admin-tour360-preview">
            <div className="admin-tour360-card-head">
              <div>
                <h2>Selector visual de hotspot</h2>
                <p className="admin-tour360-helper">Haz clic en la imagen 360 para definir la posicion del hotspot.</p>
              </div>
              <div className="admin-tour360-actions">
                <button type="button" className="admin-tour360-secondary" onClick={usarPosicionActual} disabled={!escenaSeleccionada}>
                  Usar posicion actual
                </button>
                {posicionMensaje ? <span className="admin-tour360-pill">{posicionMensaje}</span> : null}
              </div>
            </div>
            {tourPreviewEscena ? (
              <Tour360Viewer
                editorMarker={hotspotTemporal}
                editorMode
                onPanoramaClick={seleccionarHotspotDesdePreview}
                onViewerReady={setViewerApi}
                tour={tourPreviewEscena}
              />
            ) : (
              <p className="admin-tour360-empty">Selecciona o crea una escena para editar hotspots.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
