import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import usePermisosEmpresa from '../../hooks/usePermisosEmpresa';
import {
  buildEmpresaPayload,
  crearEmpresa,
  listarEmpresas,
  setEmpresaActivo,
  actualizarEmpresa,
} from '../../services/empresasInmobiliariasService';
import { formatDate, formatCurrency } from '../../services/proyectosInmobiliariosUtils';
import './AdminEmpresasInmobiliariasPage.css';

const FILTROS_INICIALES = {
  texto: '',
  soloActivas: 'true',
  estatusSuscripcion: '',
};

const ESTATUS_SUSCRIPCION = [
  'ACTIVA',
  'PENDIENTE_PAGO',
  'SUSPENDIDA',
  'CANCELADA',
];

const FORM_INICIAL = {
  id: '',
  nombreComercial: '',
  razonSocial: '',
  telefono: '',
  email: '',
  sitioWeb: '',
  logoUrl: '',
  usaLogoPropio: false,
  estatusSuscripcion: 'ACTIVA',
  montoMensualidad: '',
  fechaUltimoPago: '',
  observaciones: '',
  activo: true,
};

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible procesar la solicitud.';

const buildFormFromEmpresa = (empresa) => ({
  id: empresa.id || empresa.empresaId || '',
  nombreComercial: empresa.nombreComercial || empresa.nombre || '',
  razonSocial: empresa.razonSocial || '',
  telefono: empresa.telefono || '',
  email: empresa.email || '',
  sitioWeb: empresa.sitioWeb || '',
  logoUrl: empresa.logoUrl || '',
  usaLogoPropio: Boolean(empresa.usaLogoPropio),
  estatusSuscripcion: empresa.estatusSuscripcion || 'ACTIVA',
  montoMensualidad: empresa.montoMensualidad ?? '',
  fechaUltimoPago: empresa.fechaUltimoPago || '',
  observaciones: empresa.observaciones || '',
  activo: empresa.activo !== false,
});

const formatearFecha = (value) => formatDate(value);

export default function AdminEmpresasInmobiliariasPage() {
  const permisos = usePermisosEmpresa();
  const esAdminCn = permisos.esAdminCn;
  const [empresas, setEmpresas] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [accionandoId, setAccionandoId] = useState('');
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarEmpresas = useCallback(async (options = {}) => {
    setCargando(true);
    setError('');

    try {
      const data = await listarEmpresas({
        soloActivas: filtros.soloActivas === 'true',
        signal: options.signal,
      });
      setEmpresas(data);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(getApiErrorMessage(err));
      }
    } finally {
      if (!options.signal?.aborted) {
        setCargando(false);
      }
    }
  }, [filtros.soloActivas]);

  useEffect(() => {
    const controller = new AbortController();
    cargarEmpresas({ signal: controller.signal });
    return () => controller.abort();
  }, [cargarEmpresas]);

  useEffect(() => {
    if (!permisos.cargando && !esAdminCn) {
      setError('No tienes permiso para acceder a esta sección.');
    }
  }, [esAdminCn, permisos.cargando]);

  const filtradas = useMemo(() => {
    const texto = filtros.texto.trim().toLowerCase();
    return empresas.filter((empresa) => {
      if (filtros.estatusSuscripcion && empresa.estatusSuscripcion !== filtros.estatusSuscripcion) {
        return false;
      }

      if (!texto) {
        return true;
      }

      return [
        empresa.nombreComercial,
        empresa.nombre,
        empresa.razonSocial,
        empresa.email,
      ].join(' ').toLowerCase().includes(texto);
    });
  }, [empresas, filtros.estatusSuscripcion, filtros.texto]);

  const limpiarFiltros = () => setFiltros(FILTROS_INICIALES);

  const actualizarFiltro = (event) => {
    const { name, value } = event.target;
    setFiltros((actual) => ({ ...actual, [name]: value }));
  };

  const abrirNuevo = () => {
    setForm(FORM_INICIAL);
    setPanelAbierto(true);
    setError('');
    setMensaje('');
  };

  const abrirEdicion = async (empresa) => {
    setForm(buildFormFromEmpresa(empresa));
    setPanelAbierto(true);
    setError('');
    setMensaje('');
  };

  const cerrarPanel = () => {
    setPanelAbierto(false);
    setForm(FORM_INICIAL);
  };

  const actualizarCampo = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((actual) => ({
      ...actual,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validarFormulario = () => {
    if (!form.nombreComercial.trim()) return 'El nombre comercial es requerido.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'El correo tiene un formato invalido.';
    if (form.montoMensualidad !== '' && Number(form.montoMensualidad) < 0) return 'El monto de mensualidad no puede ser negativo.';
    return '';
  };

  const guardarEmpresa = async (event) => {
    event.preventDefault();

    const validacion = validarFormulario();
    if (validacion) {
      setError(validacion);
      return;
    }

    setGuardando(true);
    setError('');
    setMensaje('');

    try {
      const payload = buildEmpresaPayload(form);
      if (form.id) {
        await actualizarEmpresa(form.id, payload);
        setMensaje('Empresa actualizada correctamente.');
      } else {
        await crearEmpresa(payload);
        setMensaje('Empresa creada correctamente.');
      }

      cerrarPanel();
      await cargarEmpresas();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  const alternarActivo = async (empresa) => {
    const siguiente = !empresa.activo;
    if (!window.confirm(`Deseas ${siguiente ? 'activar' : 'desactivar'} la empresa "${empresa.nombre}"?`)) {
      return;
    }

    setAccionandoId(empresa.id);
    setError('');
    setMensaje('');

    try {
      await setEmpresaActivo(empresa.id, siguiente);
      setMensaje(`Empresa ${siguiente ? 'activada' : 'desactivada'} correctamente.`);
      await cargarEmpresas();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionandoId('');
    }
  };

  if (!permisos.cargando && !esAdminCn) {
    return (
      <main className="admin-empresas">
        <section className="admin-empresas-empty-state">
          <h1>No tienes permiso para acceder a esta sección.</h1>
          <Link className="admin-empresas-back" to="/admin/proyectos-inmobiliarios">Ir a proyectos inmobiliarios</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-empresas">
      <section className="admin-empresas-hero">
        <div>
          <p className="admin-empresas-eyebrow">Administracion</p>
          <h1>Empresas inmobiliarias</h1>
          <p>Gestiona las empresas que operan proyectos inmobiliarios en la plataforma.</p>
        </div>
        <div className="admin-empresas-hero-actions">
          <Link className="admin-empresas-secondary" to="/admin/proyectos-inmobiliarios">
            Ver proyectos
          </Link>
          <button type="button" className="admin-empresas-primary" onClick={abrirNuevo}>
            Nueva empresa
          </button>
        </div>
      </section>

      <section className="admin-empresas-filtros">
        <label>
          <span>Buscar</span>
          <input name="texto" value={filtros.texto} onChange={actualizarFiltro} placeholder="Nombre, razon social o correo" />
        </label>
        <label>
          <span>Estatus suscripcion</span>
          <select name="estatusSuscripcion" value={filtros.estatusSuscripcion} onChange={actualizarFiltro}>
            <option value="">Todos</option>
            {ESTATUS_SUSCRIPCION.map((estatus) => (
              <option key={estatus} value={estatus}>{estatus}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Activas</span>
          <select name="soloActivas" value={filtros.soloActivas} onChange={actualizarFiltro}>
            <option value="true">Solo activas</option>
            <option value="false">Todas</option>
          </select>
        </label>
        <button type="button" onClick={limpiarFiltros}>Limpiar</button>
      </section>

      {mensaje ? <p className="admin-empresas-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="admin-empresas-feedback is-error">{error}</p> : null}
      {cargando ? <p className="admin-empresas-feedback">Cargando empresas...</p> : null}

      {!cargando && !error ? (
        <section className="admin-empresas-card">
          {filtradas.length === 0 ? (
            <p className="admin-empresas-empty">No hay empresas inmobiliarias registradas.</p>
          ) : (
            <div className="admin-empresas-table-wrap">
              <table className="admin-empresas-table">
                <thead>
                  <tr>
                    <th>Nombre comercial</th>
                    <th>Razon social</th>
                    <th>Telefono</th>
                    <th>Correo</th>
                    <th>Sitio web</th>
                    <th>Estatus suscripcion</th>
                    <th>Mensualidad</th>
                    <th>Fecha alta</th>
                    <th>Ultimo pago</th>
                    <th>Logo propio</th>
                    <th>Activo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((empresa) => (
                    <tr key={empresa.id}>
                      <td data-label="Nombre comercial"><strong>{empresa.nombreComercial || empresa.nombre}</strong></td>
                      <td data-label="Razon social">{empresa.razonSocial || '-'}</td>
                      <td data-label="Telefono">{empresa.telefono || '-'}</td>
                      <td data-label="Correo">{empresa.email || '-'}</td>
                      <td data-label="Sitio web">
                        {empresa.sitioWeb ? <a href={empresa.sitioWeb.startsWith('http') ? empresa.sitioWeb : `https://${empresa.sitioWeb}`} target="_blank" rel="noreferrer">{empresa.sitioWeb}</a> : '-'}
                      </td>
                      <td data-label="Estatus suscripcion">
                        <span className={`admin-empresas-pill is-${String(empresa.estatusSuscripcion || '').toLowerCase()}`}>
                          {empresa.estatusSuscripcion || 'ACTIVA'}
                        </span>
                      </td>
                      <td data-label="Mensualidad">{formatCurrency(empresa.montoMensualidad)}</td>
                      <td data-label="Fecha alta">{formatearFecha(empresa.fechaAlta)}</td>
                      <td data-label="Ultimo pago">{formatearFecha(empresa.fechaUltimoPago)}</td>
                      <td data-label="Logo propio">
                        <span className={`admin-empresas-pill ${empresa.usaLogoPropio ? 'is-ok' : 'is-off'}`}>
                          {empresa.usaLogoPropio ? 'Si' : 'No'}
                        </span>
                      </td>
                      <td data-label="Activo">
                        <span className={`admin-empresas-pill ${empresa.activo ? 'is-ok' : 'is-off'}`}>
                          {empresa.activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td data-label="Acciones">
                        <div className="admin-empresas-actions">
                          <button type="button" onClick={() => abrirEdicion(empresa)}>Editar</button>
                          <Link to={`/admin/usuarios?empresaId=${empresa.id}`}>Usuarios</Link>
                          <Link to={`/admin/proyectos-inmobiliarios?empresaId=${empresa.id}`}>Proyectos</Link>
                          <button
                            type="button"
                            className="is-danger"
                            onClick={() => alternarActivo(empresa)}
                            disabled={accionandoId === empresa.id}
                          >
                            {accionandoId === empresa.id ? 'Procesando...' : empresa.activo ? 'Desactivar' : 'Activar'}
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

      {panelAbierto ? (
        <aside className="admin-empresas-modal" role="dialog" aria-modal="true" aria-label={form.id ? 'Editar empresa inmobiliaria' : 'Nueva empresa inmobiliaria'}>
          <div className="admin-empresas-modal-card">
            <div className="admin-empresas-modal-head">
              <h2>{form.id ? 'Editar empresa inmobiliaria' : 'Nueva empresa inmobiliaria'}</h2>
              <button type="button" onClick={cerrarPanel} disabled={guardando}>Cerrar</button>
            </div>

            <form className="admin-empresas-form" onSubmit={guardarEmpresa}>
              <label>
                <span>Nombre comercial</span>
                <input name="nombreComercial" value={form.nombreComercial} onChange={actualizarCampo} required />
              </label>
              <label>
                <span>Razon social</span>
                <input name="razonSocial" value={form.razonSocial} onChange={actualizarCampo} />
              </label>
              <label>
                <span>Telefono</span>
                <input name="telefono" value={form.telefono} onChange={actualizarCampo} />
              </label>
              <label>
                <span>Correo</span>
                <input type="email" name="email" value={form.email} onChange={actualizarCampo} />
              </label>
              <label>
                <span>Sitio web</span>
                <input name="sitioWeb" value={form.sitioWeb} onChange={actualizarCampo} />
              </label>
              <label>
                <span>Logo URL</span>
                <input name="logoUrl" value={form.logoUrl} onChange={actualizarCampo} />
              </label>
              <label className="admin-empresas-checkbox">
                <input type="checkbox" name="usaLogoPropio" checked={form.usaLogoPropio} onChange={actualizarCampo} />
                <span>Usa logo propio</span>
              </label>
              <label>
                <span>Estatus suscripcion</span>
                <select name="estatusSuscripcion" value={form.estatusSuscripcion} onChange={actualizarCampo}>
                  {ESTATUS_SUSCRIPCION.map((estatus) => (
                    <option key={estatus} value={estatus}>{estatus}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Monto mensualidad</span>
                <input type="number" min="0" step="0.01" name="montoMensualidad" value={form.montoMensualidad} onChange={actualizarCampo} />
              </label>
              <label>
                <span>Fecha ultimo pago</span>
                <input type="date" name="fechaUltimoPago" value={form.fechaUltimoPago} onChange={actualizarCampo} />
              </label>
              <label className="is-full">
                <span>Observaciones</span>
                <textarea name="observaciones" rows="4" value={form.observaciones} onChange={actualizarCampo} />
              </label>

              <div className="admin-empresas-form-actions">
                <button type="submit" className="admin-empresas-primary" disabled={guardando}>
                  {guardando ? 'Guardando...' : form.id ? 'Guardar cambios' : 'Crear empresa'}
                </button>
                <button type="button" onClick={cerrarPanel} disabled={guardando}>Cancelar</button>
              </div>
            </form>
          </div>
        </aside>
      ) : null}
    </main>
  );
}
