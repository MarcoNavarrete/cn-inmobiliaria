import React, { useCallback, useEffect, useState } from 'react';
import PasswordInput from '../components/common/PasswordInput';
import {
  activarUsuario,
  actualizarUsuario,
  crearUsuario,
  desactivarUsuario,
  obtenerAdminUsuarios,
  resetPasswordUsuario,
} from '../services/adminUsuariosService';
import { obtenerRoles } from '../services/catalogosService';
import { listarEmpresas } from '../services/empresasInmobiliariasService';
import {
  ROLES_EMPRESA,
  asignarUsuarioEmpresa,
  listarEmpresaUsuarios,
  setEmpresaUsuarioActivo,
} from '../services/empresasUsuariosService';
import useAuthSession from '../hooks/useAuthSession';
import './AdminUsuariosPage.css';

const ROLES_FALLBACK = [
  { id: 'USUARIO', nombre: 'USUARIO' },
  { id: 'ASESOR', nombre: 'ASESOR' },
  { id: 'ADMIN', nombre: 'ADMIN' },
  { id: 'SUPERADMIN', nombre: 'SUPERADMIN' },
];

const FORM_INICIAL = {
  id: '',
  nombre: '',
  email: '',
  rol: 'USUARIO',
  maxPublicaciones: '',
  passwordTemporal: '',
  empresaId: '',
  rolEmpresa: 'ADMIN_EMPRESA',
};


const RESET_PASSWORD_FORM_INICIAL = {
  nuevaPassword: '',
  confirmarPassword: '',
};

const ROLES_GLOBAL_CN = ['ADMIN', 'SUPERADMIN'];

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible procesar la solicitud.';

const buildFormFromUsuario = (usuario) => ({
  id: usuario.id,
  nombre: usuario.nombre,
  email: usuario.email,
  rol: usuario.rol,
  maxPublicaciones: usuario.maxPublicaciones ?? '',
  passwordTemporal: '',
  empresaId: '',
  rolEmpresa: 'ADMIN_EMPRESA',
});

const pickUsuarioIdFromResponse = (response) =>
  (typeof response === 'string' || typeof response === 'number' ? response : '') ||
  response?.usuarioId ||
  response?.UsuarioId ||
  response?.id ||
  response?.Id ||
  response?.data?.usuarioId ||
  response?.data?.UsuarioId ||
  response?.data?.id ||
  response?.data?.Id ||
  '';

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState(ROLES_FALLBACK);
  const [empresas, setEmpresas] = useState([]);
  const [relacionesEmpresa, setRelacionesEmpresa] = useState([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [cargandoRoles, setCargandoRoles] = useState(true);
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true);
  const [cargandoRelaciones, setCargandoRelaciones] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [accionandoRelacionId, setAccionandoRelacionId] = useState('');
  const [accionandoId, setAccionandoId] = useState('');
  const [usuarioResetPassword, setUsuarioResetPassword] = useState(null);
  const [resetPasswordForm, setResetPasswordForm] = useState(RESET_PASSWORD_FORM_INICIAL);
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [reseteandoPassword, setReseteandoPassword] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const { rolGlobal } = useAuthSession();

  const esEdicion = Boolean(form.id);
  const rolesDisponibles = roles.length > 0 ? roles : ROLES_FALLBACK;
  const tieneEmpresaSeleccionada = Boolean(form.empresaId);
  const rolGlobalConEmpresa = tieneEmpresaSeleccionada && ROLES_GLOBAL_CN.includes(String(form.rol || '').toUpperCase());
  const esSuperAdmin = String(rolGlobal || '').toUpperCase() === 'SUPERADMIN';

  const cargarUsuarios = useCallback(async (options = {}) => {
    setCargando(true);
    setError('');

    try {
      const data = await obtenerAdminUsuarios(options);
      setUsuarios(data);
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
    cargarUsuarios({ signal: controller.signal });
    return () => controller.abort();
  }, [cargarUsuarios]);

  useEffect(() => {
    const controller = new AbortController();

    const cargarRoles = async () => {
      setCargandoRoles(true);

      try {
        const data = await obtenerRoles({ signal: controller.signal });
        setRoles(data.length > 0 ? data : ROLES_FALLBACK);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setRoles(ROLES_FALLBACK);
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargandoRoles(false);
        }
      }
    };

    cargarRoles();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const cargarEmpresas = async () => {
      setCargandoEmpresas(true);

      try {
        const data = await listarEmpresas({ soloActivas: true, signal: controller.signal });
        setEmpresas(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargandoEmpresas(false);
        }
      }
    };

    cargarEmpresas();

    return () => controller.abort();
  }, []);

  const cargarRelacionesUsuario = useCallback(async (usuarioId, options = {}) => {
    if (!usuarioId) {
      setRelacionesEmpresa([]);
      return;
    }

    setCargandoRelaciones(true);

    try {
      const data = await listarEmpresaUsuarios({
        usuarioId,
        soloActivos: false,
        signal: options.signal,
      });
      setRelacionesEmpresa(data);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(getApiErrorMessage(err));
      }
    } finally {
      if (!options.signal?.aborted) {
        setCargandoRelaciones(false);
      }
    }
  }, []);

  const abrirNuevo = () => {
    setForm(FORM_INICIAL);
    setRelacionesEmpresa([]);
    setPanelAbierto(true);
    setError('');
    setMensaje('');
  };

  const abrirEdicion = (usuario) => {
    setForm(buildFormFromUsuario(usuario));
    cargarRelacionesUsuario(usuario.id);
    setPanelAbierto(true);
    setError('');
    setMensaje('');
  };

  const cerrarPanel = () => {
    setPanelAbierto(false);
    setForm(FORM_INICIAL);
    setRelacionesEmpresa([]);
  };

  const actualizarCampo = (event) => {
    const { name, value } = event.target;
    setForm((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

  const guardarUsuario = async (event) => {
    event.preventDefault();
    if (form.empresaId && !form.rolEmpresa) {
      setError('Selecciona el rol empresarial.');
      return;
    }

    setGuardando(true);
    setError('');
    setMensaje('');

    try {
      let usuarioId = form.id;

      if (esEdicion) {
        await actualizarUsuario(form.id, form);
      } else {
        const response = await crearUsuario(form);
        usuarioId = pickUsuarioIdFromResponse(response);

        if (!usuarioId) {
          const usuariosActualizados = await obtenerAdminUsuarios();
          const usuarioCreado = usuariosActualizados.find((usuario) =>
            String(usuario.email || '').trim().toLowerCase() === String(form.email || '').trim().toLowerCase()
          );
          usuarioId = usuarioCreado?.id || '';
        }
      }

      if (form.empresaId) {
        if (!usuarioId) {
          throw new Error('Usuario guardado, pero no fue posible identificar su usuarioId para asignarlo a la empresa.');
        }

        await asignarUsuarioEmpresa({
          empresaId: form.empresaId,
          usuarioId,
          rolEmpresa: form.rolEmpresa,
          activo: true,
        });
      }

      cerrarPanel();
      await cargarUsuarios();
      setMensaje(form.empresaId
        ? 'Usuario guardado y asignado a empresa correctamente.'
        : esEdicion ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.'
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  const ejecutarAccion = async (usuarioId, accion, textoExito) => {
    setAccionandoId(usuarioId);
    setError('');
    setMensaje('');

    try {
      await accion();
      setMensaje(textoExito);
      await cargarUsuarios();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionandoId('');
    }
  };

  const cambiarActivo = (usuario) => {
    const accion = usuario.activo ? desactivarUsuario : activarUsuario;
    const verbo = usuario.activo ? 'desactivar' : 'activar';

    if (!window.confirm(`Confirmar ${verbo} usuario?`)) {
      return;
    }

    ejecutarAccion(
      usuario.id,
      () => accion(usuario.id),
      usuario.activo ? 'Usuario desactivado.' : 'Usuario activado.'
    );
  };

  const abrirResetPassword = (usuario) => {
    setUsuarioResetPassword(usuario);
    setResetPasswordForm(RESET_PASSWORD_FORM_INICIAL);
    setResetPasswordError('');
    setError('');
    setMensaje('');
  };

  const cerrarResetPassword = () => {
    if (reseteandoPassword) {
      return;
    }

    setUsuarioResetPassword(null);
    setResetPasswordForm(RESET_PASSWORD_FORM_INICIAL);
    setResetPasswordError('');
  };

  const actualizarResetPasswordCampo = (event) => {
    const { name, value } = event.target;
    setResetPasswordForm((actual) => ({
      ...actual,
      [name]: value,
    }));
    setResetPasswordError('');
  };

  const guardarResetPassword = async (event) => {
    event.preventDefault();

    const nuevaPassword = resetPasswordForm.nuevaPassword;
    const confirmarPassword = resetPasswordForm.confirmarPassword;

    if (!nuevaPassword) {
      setResetPasswordError('La nueva contraseña temporal es obligatoria.');
      return;
    }

    if (!confirmarPassword) {
      setResetPasswordError('Confirma la contraseña temporal.');
      return;
    }

    if (nuevaPassword.length < 8) {
      setResetPasswordError('La contraseña temporal debe tener mínimo 8 caracteres.');
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setResetPasswordError('Las contraseñas temporales no coinciden.');
      return;
    }

    if (!usuarioResetPassword?.id) {
      setResetPasswordError('No fue posible identificar el usuario seleccionado.');
      return;
    }

    setReseteandoPassword(true);
    setResetPasswordError('');
    setError('');
    setMensaje('');

    try {
      await resetPasswordUsuario(usuarioResetPassword.id, nuevaPassword);
      setMensaje('Contraseña temporal actualizada correctamente.');
      setUsuarioResetPassword(null);
      setResetPasswordForm(RESET_PASSWORD_FORM_INICIAL);
    } catch (err) {
      if (err.status === 403) {
        setResetPasswordError('No tienes permisos para resetear contraseñas. Esta acción es exclusiva de SUPERADMIN.');
      } else if (err.status === 400) {
        setResetPasswordError(err.data?.mensaje || err.data?.message || err.message || 'La contraseña no cumple con los requisitos.');
      } else if (err.status === 404) {
        setResetPasswordError('Usuario no encontrado.');
      } else {
        setResetPasswordError('No se pudo actualizar la contraseña del usuario.');
      }
    } finally {
      setReseteandoPassword(false);
    }
  };

  const alternarRelacionEmpresa = async (relacion) => {
    const siguiente = !relacion.activo;

    setAccionandoRelacionId(relacion.id);
    setError('');
    setMensaje('');

    try {
      await setEmpresaUsuarioActivo(relacion.id, siguiente);
      setMensaje(`Relacion con empresa ${siguiente ? 'activada' : 'desactivada'} correctamente.`);
      await cargarRelacionesUsuario(form.id);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAccionandoRelacionId('');
    }
  };

  return (
    <main className="admin-usuarios">
      <section className="admin-usuarios-hero">
        <div>
          <p className="admin-usuarios-eyebrow">Administracion</p>
          <h1>Usuarios</h1>
        </div>
        <button type="button" className="admin-usuarios-primary" onClick={abrirNuevo}>
          Nuevo usuario
        </button>
      </section>

      {mensaje ? <p className="admin-usuarios-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="admin-usuarios-feedback is-error">{error}</p> : null}
      {cargando ? <p className="admin-usuarios-feedback">Cargando usuarios...</p> : null}
      {cargandoRoles ? <p className="admin-usuarios-feedback">Cargando roles...</p> : null}
      {cargandoEmpresas ? <p className="admin-usuarios-feedback">Cargando empresas inmobiliarias...</p> : null}

      {!cargando ? (
        <section className="admin-usuarios-card">
          {usuarios.length === 0 ? (
            <p className="admin-usuarios-empty">No hay usuarios registrados.</p>
          ) : (
            <div className="admin-usuarios-table-wrap">
              <table className="admin-usuarios-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Max publicaciones</th>
                    <th>Estado</th>
                    <th>Creacion</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id || usuario.email}>
                      <td><strong>{usuario.nombre}</strong></td>
                      <td>{usuario.email}</td>
                      <td><span className="admin-usuarios-pill">{usuario.rol}</span></td>
                      <td>{usuario.maxPublicaciones || 'Sin limite'}</td>
                      <td>
                        <span className={`admin-usuarios-status ${usuario.activo ? 'is-active' : 'is-inactive'}`}>
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>{usuario.fechaCreacion}</td>
                      <td>
                        <div className="admin-usuarios-actions">
                          <button type="button" onClick={() => abrirEdicion(usuario)}>
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => cambiarActivo(usuario)}
                            disabled={!usuario.id || accionandoId === usuario.id}
                          >
                            {usuario.activo ? 'Desactivar' : 'Activar'}
                          </button>
                          {esSuperAdmin ? (
                            <button
                              type="button"
                              className="is-danger"
                              onClick={() => abrirResetPassword(usuario)}
                              disabled={!usuario.id || accionandoId === usuario.id}
                            >
                              Resetear contraseña
                            </button>
                          ) : null}
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
        <aside className="admin-usuarios-panel" role="dialog" aria-modal="true" aria-label={esEdicion ? 'Editar usuario' : 'Crear usuario'}>
          <div className="admin-usuarios-panel-card">
            <div className="admin-usuarios-panel-head">
              <h2>{esEdicion ? 'Editar usuario' : 'Nuevo usuario'}</h2>
              <button type="button" onClick={cerrarPanel} disabled={guardando}>Cerrar</button>
            </div>

            <form className="admin-usuarios-form" onSubmit={guardarUsuario}>
              <label>
                <span>Nombre</span>
                <input name="nombre" value={form.nombre} onChange={actualizarCampo} required />
              </label>
              <label>
                <span>Email</span>
                <input name="email" type="email" value={form.email} onChange={actualizarCampo} required />
              </label>
              <label>
                <span>Rol</span>
                <select name="rol" value={form.rol} onChange={actualizarCampo} required disabled={cargandoRoles}>
                  {rolesDisponibles.map((rol) => (
                    <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                  ))}
                </select>
                <small>El rol global controla permisos internos de CN. Para empresas externas, usar Usuario.</small>
              </label>
              <label>
                <span>Max publicaciones</span>
                <input
                  name="maxPublicaciones"
                  type="number"
                  min="0"
                  value={form.maxPublicaciones}
                  onChange={actualizarCampo}
                />
              </label>
              {!esEdicion ? (
                <label>
                  <span>Password temporal</span>
                  <PasswordInput
                    name="passwordTemporal"
                    value={form.passwordTemporal}
                    onChange={actualizarCampo}
                    required
                  />
                </label>
              ) : null}

              <section className="admin-usuarios-empresa-section">
                <div>
                  <h3>Permisos en Proyectos Inmobiliarios</h3>
                  <p>Para clientes externos, usa rol global USUARIO y asigna aqui la empresa y el rol empresarial. No uses ADMIN ni SUPERADMIN para clientes externos.</p>
                </div>
                <label>
                  <span>Empresa inmobiliaria</span>
                  <select name="empresaId" value={form.empresaId} onChange={actualizarCampo} disabled={cargandoEmpresas}>
                    <option value="">Sin empresa asignada</option>
                    {empresas.map((empresa) => (
                      <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Rol empresarial</span>
                  <select name="rolEmpresa" value={form.rolEmpresa} onChange={actualizarCampo} disabled={!form.empresaId}>
                    {ROLES_EMPRESA.map((rolEmpresa) => (
                      <option key={rolEmpresa} value={rolEmpresa}>{rolEmpresa}</option>
                    ))}
                  </select>
                </label>
                {rolGlobalConEmpresa ? (
                  <p className="admin-usuarios-warning">
                    Este usuario tendra permisos globales CN ademas de permisos empresariales.
                  </p>
                ) : null}
              </section>

              {esEdicion ? (
                <section className="admin-usuarios-empresa-section">
                  <div>
                    <h3>Empresas asignadas</h3>
                    <p>Agregar una empresa y guardar actualiza o crea la relacion con ese rol empresarial.</p>
                  </div>
                  {cargandoRelaciones ? <p className="admin-usuarios-relation-empty">Cargando empresas asignadas...</p> : null}
                  {!cargandoRelaciones && relacionesEmpresa.length === 0 ? (
                    <p className="admin-usuarios-relation-empty">Este usuario no tiene empresas asignadas.</p>
                  ) : null}
                  {!cargandoRelaciones && relacionesEmpresa.length > 0 ? (
                    <div className="admin-usuarios-relations-wrap">
                      <table className="admin-usuarios-relations-table">
                        <thead>
                          <tr>
                            <th>Empresa</th>
                            <th>Rol empresarial</th>
                            <th>Activo</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {relacionesEmpresa.map((relacion) => (
                            <tr key={relacion.id || `${relacion.empresaId}-${relacion.usuarioId}`}>
                              <td>{relacion.empresaNombre}</td>
                              <td><span className="admin-usuarios-pill">{relacion.rolEmpresa}</span></td>
                              <td>
                                <span className={`admin-usuarios-status ${relacion.activo ? 'is-active' : 'is-inactive'}`}>
                                  {relacion.activo ? 'Activo' : 'Inactivo'}
                                </span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => alternarRelacionEmpresa(relacion)}
                                  disabled={!relacion.id || accionandoRelacionId === relacion.id}
                                >
                                  {relacion.activo ? 'Desactivar' : 'Activar'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </section>
              ) : null}
              <div className="admin-usuarios-form-actions">
                <button type="submit" className="admin-usuarios-primary" disabled={guardando}>
                  {guardando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear usuario'}
                </button>
                <button type="button" onClick={cerrarPanel} disabled={guardando}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </aside>
      ) : null}
      {usuarioResetPassword ? (
        <aside className="admin-usuarios-panel" role="dialog" aria-modal="true" aria-label="Resetear contraseña">
          <div className="admin-usuarios-panel-card">
            <div className="admin-usuarios-panel-head">
              <h2>Resetear contraseña</h2>
              <button type="button" onClick={cerrarResetPassword} disabled={reseteandoPassword}>Cerrar</button>
            </div>

            <form className="admin-usuarios-form" onSubmit={guardarResetPassword}>
              <p className="admin-usuarios-reset-user">
                Usuario: <strong>{usuarioResetPassword.nombre || usuarioResetPassword.email}</strong>
              </p>
              <label>
                <span>Nueva contraseña temporal</span>
                <PasswordInput
                  name="nuevaPassword"
                  value={resetPasswordForm.nuevaPassword}
                  onChange={actualizarResetPasswordCampo}
                  autoComplete="new-password"
                  minLength="8"
                  required
                />
              </label>
              <label>
                <span>Confirmar contraseña temporal</span>
                <PasswordInput
                  name="confirmarPassword"
                  value={resetPasswordForm.confirmarPassword}
                  onChange={actualizarResetPasswordCampo}
                  autoComplete="new-password"
                  minLength="8"
                  required
                />
              </label>
              {resetPasswordError ? <p className="admin-usuarios-form-error">{resetPasswordError}</p> : null}
              <div className="admin-usuarios-form-actions">
                <button type="submit" className="admin-usuarios-primary" disabled={reseteandoPassword}>
                  {reseteandoPassword ? 'Guardando...' : 'Guardar contraseña'}
                </button>
                <button type="button" onClick={cerrarResetPassword} disabled={reseteandoPassword}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </aside>
      ) : null}
    </main>
  );
}
