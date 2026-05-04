import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  eliminarAdminDesarrollo,
  listarAdminDesarrollos,
} from '../../services/adminDesarrollosService';
import './AdminDesarrollosPage.css';

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible procesar la accion.';

export default function AdminDesarrollosPage() {
  const [desarrollos, setDesarrollos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [accionandoId, setAccionandoId] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarDesarrollos = useCallback(async (options = {}) => {
    setCargando(true);
    setError('');

    try {
      const data = await listarAdminDesarrollos(options);
      setDesarrollos(data);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(getApiErrorMessage(err));
      }
    } finally {
      if (!options.signal?.aborted) {
        setCargando(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    cargarDesarrollos({ signal: controller.signal });
    return () => controller.abort();
  }, [cargarDesarrollos]);

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return desarrollos;
    return desarrollos.filter((item) =>
      [item.nombre, item.slug, item.ubicacion].join(' ').toLowerCase().includes(term)
    );
  }, [busqueda, desarrollos]);

  const eliminar = async (desarrollo) => {
    if (!window.confirm(`Eliminar o desactivar el desarrollo "${desarrollo.nombre}"?`)) {
      return;
    }

    setAccionandoId(desarrollo.id);
    setError('');
    setMensaje('');

    try {
      await eliminarAdminDesarrollo(desarrollo.id);
      setMensaje('Desarrollo eliminado o desactivado correctamente.');
      await cargarDesarrollos();
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
          <h1>Desarrollos inmobiliarios</h1>
        </div>
        <Link className="admin-desarrollos-primary" to="/admin/desarrollos/nuevo">
          Nuevo desarrollo
        </Link>
      </section>

      <section className="admin-desarrollos-filtros">
        <label>
          <span>Buscar</span>
          <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Nombre, slug o ubicacion" />
        </label>
        <button type="button" onClick={() => setBusqueda('')}>Limpiar</button>
      </section>

      {cargando ? <p className="admin-desarrollos-feedback">Cargando desarrollos...</p> : null}
      {mensaje ? <p className="admin-desarrollos-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="admin-desarrollos-feedback is-error">{error}</p> : null}

      {!cargando && !error ? (
        <section className="admin-desarrollos-card">
          {filtrados.length === 0 ? (
            <p className="admin-desarrollos-empty">No hay desarrollos registrados.</p>
          ) : (
            <div className="admin-desarrollos-table-wrap">
              <table className="admin-desarrollos-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Slug</th>
                    <th>Ubicacion</th>
                    <th>Precio desde</th>
                    <th>Destacado</th>
                    <th>Activo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((desarrollo) => (
                    <tr key={desarrollo.id}>
                      <td data-label="Nombre"><strong>{desarrollo.nombre}</strong></td>
                      <td data-label="Slug">{desarrollo.slug}</td>
                      <td data-label="Ubicacion">{desarrollo.ubicacion}</td>
                      <td data-label="Precio desde">{desarrollo.precioDesdeTexto}</td>
                      <td data-label="Destacado"><span className="admin-desarrollos-pill">{desarrollo.destacado ? 'Si' : 'No'}</span></td>
                      <td data-label="Activo"><span className={`admin-desarrollos-pill ${desarrollo.activo ? 'is-ok' : 'is-off'}`}>{desarrollo.activo ? 'Activo' : 'Inactivo'}</span></td>
                      <td data-label="Acciones">
                        <div className="admin-desarrollos-actions">
                          <Link to={`/admin/desarrollos/${desarrollo.id}/editar`}>Editar</Link>
                          <Link to={`/admin/desarrollos/${desarrollo.id}/imagenes`}>Imagenes</Link>
                          <Link to={`/admin/desarrollos/${desarrollo.id}/amenidades`}>Amenidades</Link>
                          <Link to={`/admin/desarrollos/${desarrollo.id}/modelos`}>Modelos</Link>
                          <Link to={`/admin/desarrollos/${desarrollo.id}/tour-360`}>Tour 360</Link>
                          {desarrollo.slug ? <Link to={`/desarrollos/${desarrollo.slug}`}>Ver publico</Link> : null}
                          <button
                            type="button"
                            className="is-danger"
                            onClick={() => eliminar(desarrollo)}
                            disabled={accionandoId === desarrollo.id}
                          >
                            {accionandoId === desarrollo.id ? 'Procesando...' : 'Eliminar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
