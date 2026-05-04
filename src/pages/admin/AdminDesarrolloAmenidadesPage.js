import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  actualizarDesarrolloAmenidad,
  crearDesarrolloAmenidad,
  eliminarDesarrolloAmenidad,
  listarDesarrolloAmenidades,
} from '../../services/adminDesarrollosService';
import './AdminDesarrolloAmenidadesPage.css';

const getApiErrorMessage = (err) => err.data?.mensaje || err.data?.message || err.message || 'No fue posible procesar amenidades.';

export default function AdminDesarrolloAmenidadesPage() {
  const { desarrolloId } = useParams();
  const [amenidades, setAmenidades] = useState([]);
  const [nombre, setNombre] = useState('');
  const [cargando, setCargando] = useState(true);
  const [accionandoId, setAccionandoId] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback(async (options = {}) => {
    setCargando(true);
    setError('');
    try {
      setAmenidades(await listarDesarrolloAmenidades(desarrolloId, options));
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

  const actualizarLocal = (amenidadId, cambios) => {
    setAmenidades((actuales) => actuales.map((item) => item.id === amenidadId ? { ...item, ...cambios } : item));
  };

  const agregar = async (event) => {
    event.preventDefault();
    setError('');
    setMensaje('');
    try {
      await crearDesarrolloAmenidad(desarrolloId, { nombre: nombre.trim(), activo: true });
      setNombre('');
      setMensaje('Amenidad agregada.');
      await cargar();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const guardar = async (amenidad) => {
    setAccionandoId(amenidad.id);
    setError('');
    setMensaje('');
    try {
      await actualizarDesarrolloAmenidad(desarrolloId, amenidad.id, {
        nombre: amenidad.nombre,
        activo: amenidad.activo,
      });
      setMensaje('Amenidad actualizada.');
      await cargar();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionandoId('');
    }
  };

  const eliminar = async (amenidad) => {
    if (!window.confirm(`Eliminar la amenidad "${amenidad.nombre}"?`)) return;
    setAccionandoId(amenidad.id);
    setError('');
    setMensaje('');
    try {
      await eliminarDesarrolloAmenidad(desarrolloId, amenidad.id);
      setMensaje('Amenidad eliminada.');
      await cargar();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionandoId('');
    }
  };

  return (
    <main className="admin-desarrollos">
      <section className="admin-desarrollos-hero">
        <div>
          <p className="admin-desarrollos-eyebrow">Administracion</p>
          <h1>Amenidades del desarrollo</h1>
        </div>
        <Link className="admin-desarrollos-primary" to={`/admin/desarrollos/${desarrolloId}/editar`}>Editar desarrollo</Link>
      </section>

      {mensaje ? <p className="admin-desarrollos-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="admin-desarrollos-feedback is-error">{error}</p> : null}

      <form className="admin-desarrollos-filtros" onSubmit={agregar}>
        <label><span>Nueva amenidad</span><input value={nombre} onChange={(event) => setNombre(event.target.value)} required /></label>
        <button type="submit">Agregar</button>
      </form>

      <section className="admin-desarrollos-card">
        {cargando ? <p className="admin-desarrollos-empty">Cargando amenidades...</p> : null}
        {!cargando && amenidades.length === 0 ? <p className="admin-desarrollos-empty">Este desarrollo aun no tiene amenidades.</p> : null}
        <div className="admin-desarrollos-list">
          {amenidades.map((amenidad) => (
            <article key={amenidad.id} className="admin-desarrollos-item">
              <span className="admin-desarrollos-placeholder">Amenidad</span>
              <div className="admin-desarrollos-inline-grid">
                <label className="admin-desarrollos-field is-full"><span>Nombre</span><input value={amenidad.nombre} onChange={(event) => actualizarLocal(amenidad.id, { nombre: event.target.value })} /></label>
                <label className="admin-desarrollos-check"><input type="checkbox" checked={amenidad.activo} onChange={(event) => actualizarLocal(amenidad.id, { activo: event.target.checked })} /><span>Activo</span></label>
                <div className="admin-desarrollos-actions">
                  <button type="button" onClick={() => guardar(amenidad)} disabled={accionandoId === amenidad.id}>Guardar</button>
                  <button type="button" className="is-danger" onClick={() => eliminar(amenidad)} disabled={accionandoId === amenidad.id}>Eliminar</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
