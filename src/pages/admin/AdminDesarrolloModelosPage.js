import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  actualizarDesarrolloModelo,
  crearDesarrolloModelo,
  eliminarDesarrolloModelo,
  listarDesarrolloModelos,
} from '../../services/adminDesarrollosService';
import {
  guardarPreciosModelo,
  listarPreciosModelo,
  listarTiposPrecioInmobiliario,
} from '../../services/desarrolloPreciosService';
import {
  formatearMonedaMXN,
  obtenerResumenPrecios,
} from '../../utils/preciosInmobiliarios';
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

const getTipoPrecioKeys = (item = {}) => [
  item.tipoPrecioId,
  item.tipoPrecioInmobiliarioId,
  item.id,
  item.codigo,
  item.tipoPrecioCodigo,
  item.nombre,
  item.tipoPrecioNombre,
]
  .map((value) => String(value || '').trim().toUpperCase())
  .filter(Boolean);

const findPrecioByTipo = (precios = [], tipo = {}) => {
  const keys = new Set(getTipoPrecioKeys(tipo));
  return precios.find((precio) => getTipoPrecioKeys(precio).some((key) => keys.has(key))) || null;
};

const hasPrecioValue = (value) => value !== '' && value !== null && value !== undefined;

const getTipoPrecioIdValue = (fila = {}) => {
  const value = fila.tipoPrecioId ?? fila.tipoPrecioInmobiliarioId ?? fila.catalogoTipoPrecioId;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const parsePrecioValue = (value) => {
  if (!hasPrecioValue(value)) return null;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
};

const buildPrecioModeloRowKey = (fila = {}, index = 0) => {
  const tipoPrecioId = getTipoPrecioIdValue(fila);
  if (tipoPrecioId) return `precio-modelo-${tipoPrecioId}`;
  return `precio-modelo-${fila.tipoPrecioCodigo || 'tipo'}-${index}`;
};

const isPrecioActivoInvalido = (fila = {}) => {
  if (fila.activo !== true) return false;
  const precio = parsePrecioValue(fila.precio);
  return precio === null || precio <= 0;
};



export default function AdminDesarrolloModelosPage() {
  const { desarrolloId } = useParams();
  const [modelos, setModelos] = useState([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [tiposPrecio, setTiposPrecio] = useState([]);
  const [preciosModelo, setPreciosModelo] = useState([]);
  const [modeloPreciosAbiertoId, setModeloPreciosAbiertoId] = useState('');
  const [cargando, setCargando] = useState(true);
  const [cargandoPrecios, setCargandoPrecios] = useState(false);
  const [accionandoId, setAccionandoId] = useState('');
  const [guardandoPrecios, setGuardandoPrecios] = useState(false);
  const [error, setError] = useState('');
  const [errorPrecios, setErrorPrecios] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [mensajePrecios, setMensajePrecios] = useState('');

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

  const cargarTiposPrecio = useCallback(async (options = {}) => {
    try {
      const tipos = await listarTiposPrecioInmobiliario(options);
      setTiposPrecio(tipos);
      return tipos;
    } catch (err) {
      if (err.name !== 'AbortError') {
        setTiposPrecio([]);
      }
      return [];
    }
  }, []);

  const cargarPreciosModelo = useCallback(async (modelo) => {
    if (!modelo?.id) {
      setPreciosModelo([]);
      setErrorPrecios('');
      setMensajePrecios('');
      return;
    }

    setCargandoPrecios(true);
    setErrorPrecios('');
    setMensajePrecios('');

    try {
      const [tipos, precios] = await Promise.all([
        tiposPrecio.length > 0 ? Promise.resolve(tiposPrecio) : cargarTiposPrecio(),
        listarPreciosModelo(modelo.id).catch(() => []),
      ]);

      const resumenPrecios = obtenerResumenPrecios({
        precios,
        fallbackPrecio: modelo.precioDesde ?? modelo.precio ?? form.precio,
      });
      const fuenteFilas = resumenPrecios.precios.length > 0 ? resumenPrecios.precios : tipos;

      const filasBase = fuenteFilas
        .map((tipo, index) => {
          const existente = resumenPrecios.precios.includes(tipo) ? tipo : findPrecioByTipo(resumenPrecios.precios, tipo);
          const precio = existente?.precio ?? '';
          const tipoPrecioActivo = (existente?.tipoPrecioActivo ?? tipo.tipoPrecioActivo ?? tipo.activo ?? true) !== false;

          const tipoPrecioId = getTipoPrecioIdValue(existente) || getTipoPrecioIdValue(tipo);
          const rowKey = buildPrecioModeloRowKey({
            tipoPrecioId,
            tipoPrecioCodigo: existente?.tipoPrecioCodigo || tipo.codigo || tipo.tipoPrecioCodigo || '',
          }, index);

          return {
            id: rowKey,
            rowKey,
            precioId: existente?.precioId || existente?.id || null,
            tipoPrecioId: tipoPrecioId || '',
            tipoPrecioCodigo: existente?.tipoPrecioCodigo || tipo.codigo || tipo.tipoPrecioCodigo || '',
            tipoPrecioNombre: existente?.tipoPrecioNombre || tipo.nombre || tipo.tipoPrecioNombre || tipo.descripcion || `Esquema ${index + 1}`,
            descripcion: existente?.descripcion || tipo.descripcion || '',
            precio: hasPrecioValue(precio) ? precio : '',
            activo: existente ? existente.activo !== false : false,
            tipoPrecioActivo,
            esPrincipal: existente?.esPrincipal === true,
            orden: existente?.orden ?? tipo.orden ?? index + 1,
          };
        })
        .filter((fila) => fila.tipoPrecioActivo || hasPrecioValue(fila.precio));

      setPreciosModelo(filasBase);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setPreciosModelo([]);
        setErrorPrecios(getApiErrorMessage(err));
      }
    } finally {
      setCargandoPrecios(false);
    }
  }, [cargarTiposPrecio, form.precio, tiposPrecio]);

  useEffect(() => {
    const controller = new AbortController();
    cargar({ signal: controller.signal });
    return () => controller.abort();
  }, [cargar]);

  useEffect(() => {
    cargarTiposPrecio();
  }, [cargarTiposPrecio]);

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

  const abrirPreciosModelo = async (modelo) => {
    setModeloPreciosAbiertoId(modelo.id);
    await cargarPreciosModelo(modelo);
  };

  const cerrarPreciosModelo = () => {
    setModeloPreciosAbiertoId('');
    setPreciosModelo([]);
    setErrorPrecios('');
    setMensajePrecios('');
  };

  const actualizarPrecioModeloFila = (index, cambios) => {
    if ('precio' in cambios || 'activo' in cambios) {
      setErrorPrecios('');
    }

    setPreciosModelo((actuales) =>
      actuales.map((fila, filaIndex) => (filaIndex === index ? { ...fila, ...cambios } : fila))
    );
  };

  const validarPreciosModelo = () => {
    for (const fila of preciosModelo) {
      const precioNumber = parsePrecioValue(fila.precio);

      if (fila.activo === true && (precioNumber === null || precioNumber <= 0)) {
        return `El precio de ${fila.tipoPrecioNombre} debe ser mayor a $0 si el esquema está activo.`;
      }

      if (fila.activo !== true && hasPrecioValue(fila.precio) && precioNumber === null) {
        return `El precio de ${fila.tipoPrecioNombre} debe ser un número válido.`;
      }
    }

    return '';
  };

  const guardarPreciosDelModelo = async () => {
    if (!modeloPreciosAbiertoId) {
      return;
    }

    const validacion = validarPreciosModelo();
    if (validacion) {
      setErrorPrecios(validacion);
      return;
    }

    setGuardandoPrecios(true);
    setErrorPrecios('');
    setMensajePrecios('');

    try {
      const modeloActual = modelos.find((item) => String(item.id) === String(modeloPreciosAbiertoId)) || {
        id: modeloPreciosAbiertoId,
        precioDesde: null,
        precio: null,
      };
      const payload = preciosModelo
        .map((fila, index) => {
          const tipoPrecioId = getTipoPrecioIdValue(fila);
          const precio = parsePrecioValue(fila.precio);

          if (!tipoPrecioId || precio === null) {
            return null;
          }

          return {
            tipoPrecioId,
            precio,
            descripcion: fila.descripcion || null,
            orden: Number(fila.orden || index + 1),
            activo: Boolean(fila.activo),
          };
        })
        .filter(Boolean);

      if (process.env.NODE_ENV === 'development') {
        console.log('Payload precios modelo', payload);
      }

      await guardarPreciosModelo(modeloPreciosAbiertoId, payload);
      setMensajePrecios('Precios del modelo guardados correctamente.');
      await cargar();
      await cargarPreciosModelo(modeloActual);
    } catch (err) {
      setErrorPrecios(getApiErrorMessage(err));
    } finally {
      setGuardandoPrecios(false);
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
      <label className="admin-desarrollos-field is-full"><span>Descripción</span><textarea value={modelo.descripcion} onChange={(event) => onChange({ descripcion: event.target.value })} rows="3" /></label>
      <label className="admin-desarrollos-field"><span>Precio base / fallback</span><input type="number" min="0" step="0.01" value={modelo.precio} onChange={(event) => onChange({ precio: event.target.value })} /></label>
      <label className="admin-desarrollos-field"><span>Recámaras</span><input type="number" value={modelo.recamaras} onChange={(event) => onChange({ recamaras: event.target.value })} /></label>
      <label className="admin-desarrollos-field"><span>Baños</span><input type="number" value={modelo.banos} onChange={(event) => onChange({ banos: event.target.value })} /></label>
      <label className="admin-desarrollos-field"><span>Estacionamientos</span><input type="number" value={modelo.estacionamientos} onChange={(event) => onChange({ estacionamientos: event.target.value })} /></label>
      <label className="admin-desarrollos-field"><span>Construcción m2</span><input type="number" value={modelo.construccionM2} onChange={(event) => onChange({ construccionM2: event.target.value })} /></label>
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
          <p className="admin-desarrollos-eyebrow">Administración</p>
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
                  <button type="button" onClick={() => abrirPreciosModelo(modelo)}>
                    Precios
                  </button>
                  <Link to={`/admin/desarrollos/${desarrolloId}/modelos/${modelo.id}/imagenes`}>Imágenes</Link>
                  <Link to={`/admin/desarrollos/${desarrolloId}/modelos/${modelo.id}/tour-360`}>Tour 360</Link>
                  <button type="button" className="is-danger" onClick={() => eliminar(modelo)} disabled={accionandoId === modelo.id}>Eliminar</button>
                </div>
              </div>
              {modeloPreciosAbiertoId === modelo.id ? (
                <section className="admin-desarrollos-prices">
                  <div className="admin-desarrollos-prices-head">
                    <div>
                      <h3>Precios del modelo</h3>
                      <p>Configura el precio por cada esquema de financiamiento.</p>
                    </div>
                    <button type="button" onClick={cerrarPreciosModelo} disabled={guardandoPrecios}>Cerrar</button>
                  </div>

                  {cargandoPrecios ? <p className="admin-desarrollos-empty">Cargando precios...</p> : null}
                  {errorPrecios ? <p className="admin-desarrollos-feedback is-error">{errorPrecios}</p> : null}
                  {mensajePrecios ? <p className="admin-desarrollos-feedback is-ok">{mensajePrecios}</p> : null}

                  {!cargandoPrecios && preciosModelo.length === 0 ? (
                    <p className="admin-desarrollos-empty">No se encontraron esquemas en el catálogo. Usa el catálogo de tipos de precio para comenzar.</p>
                  ) : null}

                  {!cargandoPrecios && preciosModelo.length > 0 ? (
                    <div className="admin-desarrollos-prices-table-wrap">
                      <table className="admin-desarrollos-prices-table">
                        <thead>
                          <tr>
                            <th>Esquema</th>
                            <th>Precio</th>
                            <th>Descripción</th>
                            <th>Activo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preciosModelo.map((fila, index) => (
                            <tr key={fila.rowKey || buildPrecioModeloRowKey(fila, index)}>
                              <td data-label="Esquema">
                                <strong>{fila.tipoPrecioNombre}</strong>
                                {fila.tipoPrecioCodigo ? <small>{fila.tipoPrecioCodigo}</small> : null}
                                {fila.tipoPrecioActivo === false ? <span className="admin-desarrollos-price-badge is-inactive">Inactivo</span> : null}
                              </td>
                              <td data-label="Precio">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className={errorPrecios && isPrecioActivoInvalido(fila) ? 'is-invalid' : ''}
                                  value={fila.precio}
                                  onChange={(event) => actualizarPrecioModeloFila(index, { precio: event.target.value })}
                                  disabled={!fila.activo}
                                  placeholder="Ej. 1681000"
                                />
                                <small>{fila.precio !== '' && fila.precio !== null ? formatearMonedaMXN(fila.precio) : 'MXN'}</small>
                              </td>
                              <td data-label="Descripción">
                                <input
                                  value={fila.descripcion}
                                  onChange={(event) => actualizarPrecioModeloFila(index, { descripcion: event.target.value })}
                                  placeholder="Opcional"
                                />
                              </td>
                              <td data-label="Activo">
                                <label className="admin-desarrollos-check">
                                  <input
                                    type="checkbox"
                                    checked={fila.activo}
                                    onChange={(event) => actualizarPrecioModeloFila(index, { activo: event.target.checked })}
                                  />
                                  <span>{fila.activo ? 'Sí' : 'No'}</span>
                                </label>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  <div className="admin-desarrollos-prices-actions">
                    <button type="button" onClick={guardarPreciosDelModelo} disabled={guardandoPrecios || cargandoPrecios || preciosModelo.length === 0}>
                      {guardandoPrecios ? 'Guardando...' : 'Guardar precios del modelo'}
                    </button>
                  </div>
                </section>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}







