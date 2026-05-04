import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  actualizarDesarrolloModelo,
  crearDesarrolloModelo,
  eliminarDesarrolloModelo,
  listarDesarrolloModelos,
} from '../../services/adminDesarrollosService';
import './AdminDesarrolloModelosPage.css';

const FORM_INICIAL = {
  nombre: '',
  descripcion: '',
  precio: '',
  recamaras: '',
  banos: '',
  estacionamientos: '',
  construccionM2: '',
  terrenoM2: '',
  disponible: true,
  imagenPrincipalUrl: '',
  activo: true,
};

const getApiErrorMessage = (err) => err.data?.mensaje || err.data?.message || err.message || 'No fue posible procesar modelos.';

export default function AdminDesarrolloModelosPage() {
  const { desarrolloId } = useParams();
  const [modelos, setModelos] = useState([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [cargando, setCargando] = useState(true);
  const [accionandoId, setAccionandoId] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback(async (options = {}) => {
    setCargando(true);
    setError('');
    try {
      setModelos(await listarDesarrolloModelos(desarrolloId, options));
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

  const actualizarLocal = (modeloId, cambios) => {
    setModelos((actuales) => actuales.map((item) => item.id === modeloId ? { ...item, ...cambios } : item));
  };

  const agregar = async (event) => {
    event.preventDefault();
    setError('');
    setMensaje('');
    try {
      await crearDesarrolloModelo(desarrolloId, form);
      setForm(FORM_INICIAL);
      setMensaje('Modelo agregado.');
      await cargar();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const guardar = async (modelo) => {
    setAccionandoId(modelo.id);
    setError('');
    setMensaje('');
    try {
      await actualizarDesarrolloModelo(desarrolloId, modelo.id, modelo);
      setMensaje('Modelo actualizado.');
      await cargar();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionandoId('');
    }
  };

  const eliminar = async (modelo) => {
    if (!window.confirm(`Eliminar el modelo "${modelo.nombre}"?`)) return;
    setAccionandoId(modelo.id);
    setError('');
    setMensaje('');
    try {
      await eliminarDesarrolloModelo(desarrolloId, modelo.id);
      setMensaje('Modelo eliminado.');
      await cargar();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionandoId('');
    }
  };

  const renderCamposModelo = (modelo, onChange, prefix = '') => (
    <>
      <label className="admin-desarrollos-field"><span>Nombre</span><input name={`${prefix}nombre`} value={modelo.nombre} onChange={(event) => onChange({ nombre: event.target.value })} required /></label>
      <label className="admin-desarrollos-field is-full"><span>Descripcion</span><textarea value={modelo.descripcion} onChange={(event) => onChange({ descripcion: event.target.value })} rows="3" /></label>
      <label className="admin-desarrollos-field"><span>Precio</span><input type="number" value={modelo.precio} onChange={(event) => onChange({ precio: event.target.value })} /></label>
      <label className="admin-desarrollos-field"><span>Recamaras</span><input type="number" value={modelo.recamaras} onChange={(event) => onChange({ recamaras: event.target.value })} /></label>
      <label className="admin-desarrollos-field"><span>Banos</span><input type="number" value={modelo.banos} onChange={(event) => onChange({ banos: event.target.value })} /></label>
      <label className="admin-desarrollos-field"><span>Estacionamientos</span><input type="number" value={modelo.estacionamientos} onChange={(event) => onChange({ estacionamientos: event.target.value })} /></label>
      <label className="admin-desarrollos-field"><span>Construccion m2</span><input type="number" value={modelo.construccionM2} onChange={(event) => onChange({ construccionM2: event.target.value })} /></label>
      <label className="admin-desarrollos-field"><span>Terreno m2</span><input type="number" value={modelo.terrenoM2} onChange={(event) => onChange({ terrenoM2: event.target.value })} /></label>
      <label className="admin-desarrollos-field is-full"><span>Imagen principal URL</span><input value={modelo.imagenPrincipalUrl} onChange={(event) => onChange({ imagenPrincipalUrl: event.target.value })} /></label>
      <label className="admin-desarrollos-check"><input type="checkbox" checked={modelo.disponible} onChange={(event) => onChange({ disponible: event.target.checked })} /><span>Disponible</span></label>
      <label className="admin-desarrollos-check"><input type="checkbox" checked={modelo.activo} onChange={(event) => onChange({ activo: event.target.checked })} /><span>Activo</span></label>
    </>
  );

  return (
    <main className="admin-desarrollos">
      <section className="admin-desarrollos-hero">
        <div>
          <p className="admin-desarrollos-eyebrow">Administracion</p>
          <h1>Modelos del desarrollo</h1>
        </div>
        <Link className="admin-desarrollos-primary" to={`/admin/desarrollos/${desarrolloId}/editar`}>Editar desarrollo</Link>
      </section>

      {mensaje ? <p className="admin-desarrollos-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="admin-desarrollos-feedback is-error">{error}</p> : null}

      <form className="admin-desarrollos-form-card" onSubmit={agregar}>
        <h2>Nuevo modelo</h2>
        <div className="admin-desarrollos-inline-grid">
          {renderCamposModelo(form, (cambios) => setForm((actual) => ({ ...actual, ...cambios })))}
          <div className="admin-desarrollos-form-actions"><button type="submit">Agregar modelo</button></div>
        </div>
      </form>

      <section className="admin-desarrollos-card">
        {cargando ? <p className="admin-desarrollos-empty">Cargando modelos...</p> : null}
        {!cargando && modelos.length === 0 ? <p className="admin-desarrollos-empty">Este desarrollo aun no tiene modelos.</p> : null}
        <div className="admin-desarrollos-list">
          {modelos.map((modelo) => (
            <article key={modelo.id} className="admin-desarrollos-item">
              {modelo.imagenPrincipal ? <img className="admin-desarrollos-preview" src={modelo.imagenPrincipal} alt="" /> : <span className="admin-desarrollos-placeholder">Sin imagen</span>}
              <div className="admin-desarrollos-inline-grid">
                {renderCamposModelo(modelo, (cambios) => actualizarLocal(modelo.id, cambios))}
                <div className="admin-desarrollos-actions">
                  <button type="button" onClick={() => guardar(modelo)} disabled={accionandoId === modelo.id}>Guardar</button>
                  <Link to={`/admin/desarrollos/${desarrolloId}/modelos/${modelo.id}/imagenes`}>Imagenes</Link>
                  <Link to={`/admin/desarrollos/${desarrolloId}/modelos/${modelo.id}/tour-360`}>Tour 360</Link>
                  <button type="button" className="is-danger" onClick={() => eliminar(modelo)} disabled={accionandoId === modelo.id}>Eliminar</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
