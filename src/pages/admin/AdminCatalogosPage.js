import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuthSession from '../../hooks/useAuthSession';
import {
  actualizarCatalogoItem,
  crearCatalogoItem,
  desactivarCatalogoItem,
  listarCatalogo,
  listarCatalogosAdministrables,
} from '../../services/adminCatalogosService';
import './AdminCatalogosPage.css';

const CATALOGO_INICIAL = 'tipos-precio-inmobiliario';

const FORM_INICIAL = {
  id: '',
  codigo: '',
  nombre: '',
  descripcion: '',
  orden: '1',
  activo: true,
};

const normalizeCodigo = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 50);

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible procesar el catálogo.';

export default function AdminCatalogosPage() {
  const { cargando, esAdminCn, rolGlobal } = useAuthSession();
  const puedeAdministrarCatalogos = esAdminCn || ['SUPERADMIN', 'ADMIN'].includes(String(rolGlobal || '').toUpperCase());
  const [catalogos, setCatalogos] = useState([]);
  const [catalogoKey, setCatalogoKey] = useState(CATALOGO_INICIAL);
  const [items, setItems] = useState([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [cargandoItems, setCargandoItems] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [accionandoId, setAccionandoId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modoModal, setModoModal] = useState('crear');
  const [form, setForm] = useState(FORM_INICIAL);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [errorModal, setErrorModal] = useState('');

  const catalogoActual = useMemo(
    () => catalogos.find((catalogo) => catalogo.key === catalogoKey) || catalogos[0] || null,
    [catalogoKey, catalogos]
  );

  const hayInactivos = useMemo(() => items.some((item) => item.activo === false), [items]);

  const cargarItems = useCallback(async (key = catalogoKey, options = {}) => {
    if (!key) return;

    setCargandoItems(true);
    setError('');

    try {
      const data = await listarCatalogo(key, { signal: options.signal });
      setItems(data);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setItems([]);
        setError(getApiErrorMessage(err));
      }
    } finally {
      if (!options.signal?.aborted) {
        setCargandoItems(false);
      }
    }
  }, [catalogoKey]);

  useEffect(() => {
    if (!puedeAdministrarCatalogos) {
      setCargandoCatalogos(false);
      return undefined;
    }

    const controller = new AbortController();

    const cargar = async () => {
      setCargandoCatalogos(true);
      setError('');

      try {
        const data = await listarCatalogosAdministrables({ signal: controller.signal });
        setCatalogos(data);
        const keyInicial = data.some((catalogo) => catalogo.key === CATALOGO_INICIAL)
          ? CATALOGO_INICIAL
          : data[0]?.key || CATALOGO_INICIAL;
        setCatalogoKey(keyInicial);
        await cargarItems(keyInicial, { signal: controller.signal });
      } catch (err) {
        if (err.name !== 'AbortError') {
          setCatalogos([{ key: CATALOGO_INICIAL, nombre: 'Tipos de precio inmobiliario' }]);
          setCatalogoKey(CATALOGO_INICIAL);
          setError('No se pudieron cargar los catálogos.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargandoCatalogos(false);
        }
      }
    };

    cargar();
    return () => controller.abort();
  }, [cargarItems, puedeAdministrarCatalogos]);

  const cambiarCatalogo = async (key) => {
    setCatalogoKey(key);
    setMensaje('');
    await cargarItems(key);
  };

  const abrirNuevo = () => {
    setModoModal('crear');
    setForm(FORM_INICIAL);
    setErrorModal('');
    setModalOpen(true);
  };

  const abrirEditar = (item) => {
    setModoModal('editar');
    setForm({
      id: item.id,
      codigo: item.codigo,
      nombre: item.nombre,
      descripcion: item.descripcion || '',
      orden: String(item.orden ?? 1),
      activo: item.activo !== false,
    });
    setErrorModal('');
    setModalOpen(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModalOpen(false);
    setForm(FORM_INICIAL);
    setErrorModal('');
  };

  const actualizarCampo = (event) => {
    const { checked, name, type, value } = event.target;

    setForm((actual) => ({
      ...actual,
      [name]: type === 'checkbox'
        ? checked
        : name === 'codigo'
          ? normalizeCodigo(value)
          : value,
    }));
  };

  const validar = () => {
    if (!form.codigo.trim()) return 'El código es requerido.';
    if (!/^[A-Z0-9_]{1,50}$/.test(form.codigo.trim())) {
      return 'El código solo puede contener mayúsculas, números y guion bajo.';
    }
    if (!form.nombre.trim()) return 'El nombre es requerido.';
    if (form.nombre.trim().length > 100) return 'El nombre no debe exceder 100 caracteres.';
    if (form.descripcion.trim().length > 300) return 'La descripción no debe exceder 300 caracteres.';
    if (!Number.isInteger(Number(form.orden))) return 'El orden debe ser un número entero.';
    return '';
  };

  const guardar = async (event) => {
    event.preventDefault();
    const validacion = validar();

    if (validacion) {
      setErrorModal(validacion);
      return;
    }

    setGuardando(true);
    setErrorModal('');
    setMensaje('');

    const payload = {
      codigo: form.codigo.trim(),
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      orden: Number(form.orden),
      activo: form.activo,
    };

    try {
      if (modoModal === 'editar') {
        await actualizarCatalogoItem(catalogoKey, form.id, payload);
        setMensaje('Catálogo actualizado correctamente.');
      } else {
        await crearCatalogoItem(catalogoKey, payload);
        setMensaje('Registro creado correctamente.');
      }

      setModalOpen(false);
      setForm(FORM_INICIAL);
      setErrorModal('');
      await cargarItems(catalogoKey);
    } catch (err) {
      setErrorModal(getApiErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  const desactivar = async (item) => {
    if (!window.confirm('¿Deseas desactivar este registro? No se eliminará físicamente, pero dejará de aparecer como activo.')) {
      return;
    }

    setAccionandoId(item.id);
    setError('');
    setMensaje('');

    try {
      await desactivarCatalogoItem(catalogoKey, item.id);
      setMensaje('Registro desactivado correctamente.');
      await cargarItems(catalogoKey);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionandoId('');
    }
  };

  const reactivar = async (item) => {
    setAccionandoId(item.id);
    setError('');
    setMensaje('');

    try {
      await actualizarCatalogoItem(catalogoKey, item.id, {
        codigo: item.codigo,
        nombre: item.nombre,
        descripcion: item.descripcion || '',
        orden: item.orden ?? 1,
        activo: true,
      });
      setMensaje('Registro reactivado correctamente.');
      await cargarItems(catalogoKey);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionandoId('');
    }
  };

  if (cargando || cargandoCatalogos) {
    return (
      <main className="admin-catalogos">
        <p className="admin-catalogos-feedback">Cargando catálogos...</p>
      </main>
    );
  }

  if (!puedeAdministrarCatalogos) {
    return (
      <main className="admin-catalogos">
        <section className="admin-catalogos-empty">
          <h1>No tienes permiso para acceder a esta sección.</h1>
          <Link to="/admin/proyectos-inmobiliarios">Ir a proyectos inmobiliarios</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-catalogos">
      <section className="admin-catalogos-hero">
        <div>
          <p className="admin-catalogos-eyebrow">Catálogos</p>
          <h1>Administración de catálogos</h1>
          <p>Administra catálogos simples usados por precios, modelos y unidades.</p>
        </div>
        <button type="button" onClick={abrirNuevo}>Nuevo registro</button>
      </section>

      {mensaje ? <p className="admin-catalogos-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="admin-catalogos-feedback is-error">{error}</p> : null}

      <section className="admin-catalogos-layout">
        <aside className="admin-catalogos-list" aria-label="Catálogos administrables">
          <h2>Catálogos</h2>
          {catalogos.map((catalogo) => (
            <button
              key={catalogo.key}
              type="button"
              className={catalogo.key === catalogoKey ? 'is-active' : ''}
              onClick={() => cambiarCatalogo(catalogo.key)}
            >
              <span>{catalogo.nombre}</span>
              {catalogo.descripcion ? <small>{catalogo.descripcion}</small> : null}
            </button>
          ))}
        </aside>

        <section className="admin-catalogos-panel">
          <div className="admin-catalogos-panel-head">
            <div>
              <p className="admin-catalogos-eyebrow">Catálogo seleccionado</p>
              <h2>{catalogoActual?.nombre || 'Tipos de precio inmobiliario'}</h2>
              <span>Los registros inactivos se muestran con badge y pueden reactivarse si el API los devuelve.</span>
            </div>
            <button type="button" onClick={() => cargarItems(catalogoKey)} disabled={cargandoItems}>Recargar</button>
          </div>

          {!hayInactivos ? (
            <p className="admin-catalogos-note">
              Si existen registros inactivos y no aparecen aquí, el endpoint GET está devolviendo solo activos; en ese caso no es posible reactivarlos desde esta tabla hasta que el API los incluya.
            </p>
          ) : null}

          {cargandoItems ? <p className="admin-catalogos-feedback">Cargando registros...</p> : null}
          {!cargandoItems && items.length === 0 ? <p className="admin-catalogos-empty-inline">No hay registros en este catálogo.</p> : null}

          {!cargandoItems && items.length > 0 ? (
            <div className="admin-catalogos-table-wrap">
              <table className="admin-catalogos-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th>Orden</th>
                    <th>Activo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id || item.codigo} className={item.activo ? '' : 'is-inactive'}>
                      <td data-label="Código"><code>{item.codigo}</code></td>
                      <td data-label="Nombre"><strong>{item.nombre}</strong></td>
                      <td data-label="Descripción">{item.descripcion || '-'}</td>
                      <td data-label="Orden">{item.orden}</td>
                      <td data-label="Activo">
                        <span className={`admin-catalogos-badge ${item.activo ? 'is-active' : 'is-inactive'}`}>
                          {item.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td data-label="Acciones">
                        <div className="admin-catalogos-actions">
                          <button type="button" onClick={() => abrirEditar(item)}>Editar</button>
                          {item.activo ? (
                            <button type="button" className="is-danger" onClick={() => desactivar(item)} disabled={accionandoId === item.id}>
                              {accionandoId === item.id ? 'Procesando...' : 'Desactivar'}
                            </button>
                          ) : (
                            <button type="button" onClick={() => reactivar(item)} disabled={accionandoId === item.id}>
                              {accionandoId === item.id ? 'Procesando...' : 'Reactivar'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </section>

      {modalOpen ? (
        <div className="admin-catalogos-modal-overlay" role="presentation" onMouseDown={cerrarModal}>
          <section className="admin-catalogos-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-catalogos-modal-head">
              <div>
                <p className="admin-catalogos-eyebrow">{modoModal === 'editar' ? 'Editar registro' : 'Nuevo registro'}</p>
                <h2>{catalogoActual?.nombre || 'Catálogo'}</h2>
              </div>
              <button type="button" onClick={cerrarModal} disabled={guardando} aria-label="Cerrar">x</button>
            </div>

            <form onSubmit={guardar} className="admin-catalogos-form">
              <label>
                <span>Código</span>
                <input
                  name="codigo"
                  value={form.codigo}
                  onChange={actualizarCampo}
                  maxLength="50"
                  required
                  readOnly={modoModal === 'editar'}
                  placeholder="CONTADO"
                />
                <small>El código técnico se usa internamente por el sistema y no se puede modificar después de crear el registro.</small>
              </label>

              <label>
                <span>Nombre</span>
                <input name="nombre" value={form.nombre} onChange={actualizarCampo} maxLength="100" required placeholder="Contado" />
              </label>

              <label className="is-full">
                <span>Descripción</span>
                <textarea name="descripcion" value={form.descripcion} onChange={actualizarCampo} maxLength="300" rows="3" placeholder="Descripción opcional" />
              </label>

              <label>
                <span>Orden</span>
                <input name="orden" type="number" step="1" value={form.orden} onChange={actualizarCampo} />
              </label>

              <label className="admin-catalogos-check">
                <input name="activo" type="checkbox" checked={form.activo} onChange={actualizarCampo} />
                <span>Activo</span>
              </label>

              {errorModal ? <p className="admin-catalogos-feedback is-error is-full">{errorModal}</p> : null}

              <div className="admin-catalogos-modal-actions">
                <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
                <button type="button" onClick={cerrarModal} disabled={guardando}>Cancelar</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
