import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Tour360Viewer from '../../components/Tour360Viewer';
import {
  actualizarHotspot,
  crearHotspot,
  eliminarHotspot,
  listarEscenas,
  listarHotspots,
} from '../../services/tour360Service';
import './AdminTour360HotspotsPage.css';

const FORM_INICIAL = {
  tipo: 'INFO',
  etiqueta: '',
  escenaDestinoId: '',
  pitch: 0,
  yaw: 0,
  icono: '',
  activo: true,
};

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible procesar hotspots.';

export default function AdminTour360HotspotsPage() {
  const { escenaId } = useParams();
  const location = useLocation();
  const tourId = new URLSearchParams(location.search).get('tourId');
  const contexto = location.state || {};
  const returnUrl =
    contexto.returnUrl ||
    (contexto.tipoEntidad === 'MODELO_DESARROLLO' && contexto.desarrolloId && contexto.modeloId
      ? `/admin/desarrollos/${contexto.desarrolloId}/modelos/${contexto.modeloId}/tour-360`
      : contexto.desarrolloId
        ? `/admin/desarrollos/${contexto.desarrolloId}/tour-360`
        : '/admin/desarrollos');
  const [escenas, setEscenas] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [posicionSeleccionada, setPosicionSeleccionada] = useState('');
  const [posicionMarker, setPosicionMarker] = useState(null);
  const [viewerApi, setViewerApi] = useState(null);
  const [editandoId, setEditandoId] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');

    try {
      const [hotspotsData, escenasData] = await Promise.all([
        listarHotspots(escenaId),
        tourId ? listarEscenas(tourId) : Promise.resolve([]),
      ]);
      setHotspots(hotspotsData);
      setEscenas(escenasData);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setCargando(false);
    }
  }, [escenaId, tourId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const actualizarCampo = (event) => {
    const { checked, name, type, value } = event.target;
    setForm((actual) => ({ ...actual, [name]: type === 'checkbox' ? checked : value }));
  };

  const validarForm = () => {
    if (form.pitch === '' || form.pitch === null || form.pitch === undefined) {
      return 'Pitch es requerido.';
    }

    if (form.yaw === '' || form.yaw === null || form.yaw === undefined) {
      return 'Yaw es requerido.';
    }

    if (form.tipo === 'LINK_ESCENA' && !form.escenaDestinoId) {
      return 'Selecciona una escena destino para LINK_ESCENA.';
    }

    if (form.tipo === 'INFO' && !String(form.etiqueta || '').trim()) {
      return 'La etiqueta es requerida para INFO.';
    }

    return '';
  };

  const seleccionarPosicion = useCallback(({ pitch, yaw }) => {
    const pitchRedondeado = Number(pitch).toFixed(6);
    const yawRedondeado = Number(yaw).toFixed(6);

    setForm((actual) => ({
      ...actual,
      pitch: pitchRedondeado,
      yaw: yawRedondeado,
    }));
    setPosicionMarker({
      pitch: Number(pitchRedondeado),
      yaw: Number(yawRedondeado),
      sceneId: escenaId,
    });
    setPosicionSeleccionada(`Posicion seleccionada: pitch ${pitchRedondeado}, yaw ${yawRedondeado}`);
  }, [escenaId]);

  const usarPosicionActual = () => {
    if (!viewerApi?.getPitch || !viewerApi?.getYaw) {
      setError('El visor aun no esta listo para obtener la posicion actual.');
      return;
    }

    seleccionarPosicion({
      pitch: viewerApi.getPitch(),
      yaw: viewerApi.getYaw(),
    });
  };

  const guardar = async (event) => {
    event.preventDefault();
    setGuardando(true);
    setError('');
    setMensaje('');

    const errorValidacion = validarForm();
    if (errorValidacion) {
      setError(errorValidacion);
      setGuardando(false);
      return;
    }

    try {
      if (editandoId) {
        await actualizarHotspot(editandoId, form);
      } else {
        await crearHotspot(escenaId, form);
      }

      setMensaje(editandoId ? 'Hotspot actualizado.' : 'Hotspot agregado.');
      setEditandoId('');
      setForm(FORM_INICIAL);
      setPosicionSeleccionada('');
      setPosicionMarker(null);
      await cargar();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  const escenaActual = escenas.find((escena) => escena.id === escenaId);
  const tourPreview = useMemo(
    () =>
      escenaActual
        ? {
            id: tourId || 'preview',
            titulo: 'Preview hotspot',
            descripcion: 'Haz clic en la imagen 360 para definir la posicion del hotspot.',
            escenaInicialId: escenaId,
            escenas: [escenaActual],
          }
        : null,
    [escenaActual, escenaId, tourId]
  );

  const eliminar = async (hotspot) => {
    if (!window.confirm(`Eliminar hotspot "${hotspot.etiqueta}"?`)) return;
    setGuardando(true);
    setError('');
    setMensaje('');

    try {
      await eliminarHotspot(hotspot.id);
      setMensaje('Hotspot eliminado.');
      await cargar();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="admin-tour360">
      <section className="admin-tour360-hero">
        <div>
          <p className="admin-tour360-eyebrow">Administracion</p>
          <h1>Hotspots de escena</h1>
        </div>
        <div className="admin-tour360-actions">
          <Link className="admin-tour360-primary" to={returnUrl}>Volver al tour</Link>
          <Link className="admin-tour360-secondary" to="/admin/desarrollos">Volver a desarrollos</Link>
        </div>
      </section>

      {mensaje ? <p className="admin-tour360-alert admin-tour360-alert-ok">{mensaje}</p> : null}
      {error ? <p className="admin-tour360-alert admin-tour360-alert-error">{error}</p> : null}

      <div className="admin-tour360-grid">
        <section className="admin-tour360-card">
          <div className="admin-tour360-card-head">
            <h2>Hotspots</h2>
            <span className="admin-tour360-pill">{hotspots.length}</span>
          </div>
          {cargando ? <p className="admin-tour360-empty">Cargando hotspots...</p> : null}
          {!cargando && hotspots.length === 0 ? <p className="admin-tour360-empty">Esta escena aun no tiene hotspots.</p> : null}
          <div className="admin-tour360-list">
            {hotspots.map((hotspot) => (
              <article key={hotspot.id} className="admin-tour360-list-item">
                <div>
                  <strong>{hotspot.etiqueta}</strong>
                  <span>{hotspot.tipo} - pitch {hotspot.pitch} - yaw {hotspot.yaw}</span>
                </div>
                <div className="admin-tour360-item-actions">
                  <button type="button" onClick={() => { setEditandoId(hotspot.id); setForm({ ...FORM_INICIAL, ...hotspot }); setPosicionSeleccionada(''); setPosicionMarker({ pitch: Number(hotspot.pitch), yaw: Number(hotspot.yaw), sceneId: escenaId }); }}>Editar</button>
                  <button type="button" className="danger" onClick={() => eliminar(hotspot)} disabled={guardando}>Eliminar</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-tour360-card">
          <h2>{editandoId ? 'Editar hotspot' : 'Agregar hotspot'}</h2>
          <form className="admin-tour360-form compact" onSubmit={guardar}>
            <div className="admin-tour360-row two">
              <label className="admin-tour360-field"><span>Tipo</span><select name="tipo" value={form.tipo} onChange={actualizarCampo}><option value="INFO">INFO</option><option value="LINK_ESCENA">LINK_ESCENA</option></select></label>
              <label className="admin-tour360-field"><span>Etiqueta</span><input name="etiqueta" value={form.etiqueta} onChange={actualizarCampo} required /></label>
              <label className="admin-tour360-field"><span>Pitch</span><input name="pitch" type="number" step="0.01" value={form.pitch} onChange={actualizarCampo} /></label>
              <label className="admin-tour360-field"><span>Yaw</span><input name="yaw" type="number" step="0.01" value={form.yaw} onChange={actualizarCampo} /></label>
              <label className="admin-tour360-field"><span>Icono</span><input name="icono" value={form.icono} onChange={actualizarCampo} /></label>
              <label className="admin-tour360-field"><span>Escena destino</span><select name="escenaDestinoId" value={form.escenaDestinoId || ''} onChange={actualizarCampo} disabled={form.tipo !== 'LINK_ESCENA'}><option value="">Sin destino</option>{escenas.filter((escena) => escena.id !== escenaId).map((escena) => <option key={escena.id} value={escena.id}>{escena.nombre}</option>)}</select></label>
            </div>
            <label className="admin-tour360-check"><input name="activo" type="checkbox" checked={form.activo} onChange={actualizarCampo} /><span>Activo</span></label>
            <div className="admin-tour360-actions">
              <button type="submit" className="admin-tour360-primary" disabled={guardando}>{editandoId ? 'Guardar hotspot' : 'Agregar hotspot'}</button>
              {editandoId ? <button type="button" className="admin-tour360-secondary" onClick={() => { setEditandoId(''); setForm(FORM_INICIAL); setPosicionSeleccionada(''); setPosicionMarker(null); }}>Cancelar</button> : null}
            </div>
          </form>
        </section>
      </div>

      <section className="admin-tour360-preview">
        <div className="admin-tour360-card-head">
          <div>
            <h2>Selector visual</h2>
            <p className="admin-tour360-helper">Haz clic en la imagen 360 para definir la posicion del hotspot.</p>
          </div>
          <button type="button" className="admin-tour360-secondary" onClick={usarPosicionActual}>
            Usar posicion actual del visor
          </button>
          {posicionSeleccionada ? <span className="admin-tour360-pill">{posicionSeleccionada}</span> : null}
        </div>
        {tourPreview ? (
          <Tour360Viewer
            editorMarker={posicionMarker}
            editorMode
            onPanoramaClick={seleccionarPosicion}
            onViewerReady={setViewerApi}
            tour={tourPreview}
          />
        ) : (
          <p className="admin-tour360-empty">No se pudo cargar la escena para seleccionar posicion.</p>
        )}
      </section>
    </main>
  );
}
