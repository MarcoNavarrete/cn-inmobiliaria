import React, { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaBell,
  FaBuilding,
  FaChartBar,
  FaClipboardList,
  FaCog,
  FaFolderOpen,
  FaHome,
  FaImages,
  FaProjectDiagram,
  FaSignOutAlt,
  FaTachometerAlt,
  FaUserCheck,
  FaUsers,
} from 'react-icons/fa';
import { cerrarSesion } from '../services/authService';
import { obtenerMenu } from '../services/menuService';
import {
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
  obtenerNotificaciones,
} from '../services/notificacionesService';
import useAuthSession from '../hooks/useAuthSession';
import './AdminLayout.css';

const ROLES_INTERNOS_CN = ['ASESOR', 'SUPERVISOR', 'ADMIN', 'SUPERADMIN'];

const ICONOS_MENU = {
  arrowleft: FaArrowLeft,
  apartados: FaClipboardList,
  building: FaBuilding,
  chart: FaChartBar,
  charts: FaChartBar,
  configuracion: FaCog,
  config: FaCog,
  dashboard: FaTachometerAlt,
  estadisticas: FaChartBar,
  folderopen: FaFolderOpen,
  home: FaHome,
  image: FaImages,
  images: FaImages,
  inmueble: FaBuilding,
  properties: FaHome,
  propiedades: FaHome,
  project: FaProjectDiagram,
  projects: FaProjectDiagram,
  proyecto: FaProjectDiagram,
  proyectos: FaProjectDiagram,
  prospectos: FaUserCheck,
  signout: FaSignOutAlt,
  usuarios: FaUsers,
  users: FaUsers,
  usercheck: FaUserCheck,
};

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.items)) {
    return value.items;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  return [];
};

const limpiarLabel = (value) => String(value || '').trim().replace(/^[-\s]+/, '');

const normalizarRuta = (ruta) => {
  const value = String(ruta || '').trim();

  if (!value) {
    return '';
  }

  const limpia = value.split(/[?#]/)[0].replace(/\/+$/, '');

  if (!limpia) {
    return '/admin';
  }

  return limpia.startsWith('/') ? limpia : `/${limpia}`;
};

const canonizarRuta = (ruta) => {
  const value = normalizarRuta(ruta);

  if (value === '/admin/dashboard') {
    return '/admin';
  }

  return value;
};

const obtenerIconoPorRuta = (item) => {
  const ruta = canonizarRuta(item?.ruta);
  const nombre = limpiarLabel(item?.nombre).toLowerCase();

  if (ruta === '/admin') return FaTachometerAlt;
  if (ruta === '/admin/usuarios' || nombre.includes('usuarios')) return FaUsers;
  if (ruta === '/admin/desarrollos' || nombre.includes('desarrollos')) return FaBuilding;
  if (ruta === '/admin/proyectos-inmobiliarios' || nombre.includes('proyectos inmobiliarios')) return FaProjectDiagram;
  if (ruta === '/admin/prospectos' || nombre.includes('prospectos')) return FaUserCheck;
  if (ruta === '/admin/apartados' || nombre.includes('apartados')) return FaClipboardList;
  if (ruta === '/admin/catalogos' || nombre.includes('catalog')) return FaFolderOpen;
  if (ruta === '/admin/configuracion' || nombre.includes('config')) return FaCog;
  if (nombre.includes('estad')) return FaChartBar;
  if (nombre.includes('volver al sitio')) return FaArrowLeft;
  if (nombre.includes('cerrar sesion')) return FaSignOutAlt;

  return null;
};

const puntuarItemMenu = (item) => {
  let score = 0;

  if (limpiarLabel(item.nombre)) score += 4;
  if (canonizarRuta(item.ruta)) score += 3;
  if (item.icono || obtenerIconoPorRuta(item)) score += 2;
  if (!/^[-\s]/.test(String(item.nombre || ''))) score += 1;
  if ((item.children || []).length > 0) score += 1;

  return score;
};

const limpiarMenu = (items) => {
  const normalizados = normalizeList(items)
    .filter((item) => item?.activo !== false)
    .map((item) => ({
      ...item,
      nombre: limpiarLabel(item.nombre),
      ruta: canonizarRuta(item.ruta),
      children: limpiarMenu(item.children),
    }))
    .filter((item) => item.nombre || item.ruta || item.children.length > 0)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  const porRuta = new Map();

  normalizados.forEach((item) => {
    const key = item.ruta || `__sin_ruta__${item.nombre}`;
    const actual = porRuta.get(key);

    if (!actual || puntuarItemMenu(item) > puntuarItemMenu(actual)) {
      porRuta.set(key, item);
    }
  });

  return Array.from(porRuta.values());
};

const resumirTexto = (value, maxLength = 110) => {
  const text = String(value || '').trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
};

const formatearFechaRelativa = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const diffMs = Date.now() - date.getTime();
  const absMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (absMs < minute) {
    return 'hace un momento';
  }

  if (absMs < hour) {
    const minutes = Math.max(1, Math.round(absMs / minute));
    return `hace ${minutes} min`;
  }

  if (absMs < day) {
    const hours = Math.max(1, Math.round(absMs / hour));
    return `hace ${hours} h`;
  }

  if (absMs < 2 * day) {
    return 'ayer';
  }

  const days = Math.round(absMs / day);
  return `hace ${days} dias`;
};

function MenuIcon({ icono }) {
  const Icon = ICONOS_MENU[String(icono || '').trim().toLowerCase().replace(/[\s_-]+/g, '')] || FaHome;

  return <Icon aria-hidden="true" />;
}

function MenuItem({ item }) {
  const children = item.children || [];
  const icono = item.icono || obtenerIconoPorRuta(item);

  return (
    <div className="admin-nav-item">
      <NavLink to={item.ruta || '/admin'} end={canonizarRuta(item.ruta) === '/admin'}>
        <MenuIcon icono={icono} />
        <span>{limpiarLabel(item.nombre)}</span>
      </NavLink>
      {children.length > 0 ? (
        <div className="admin-nav-children">
          {children.map((child) => (
            <MenuItem key={child.menuId || child.ruta || child.nombre} item={child} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cargando: cargandoSesion, rolGlobal, esAdminCn, tieneAccesoEmpresarial } = useAuthSession();
  const esUsuarioInternoCn = ROLES_INTERNOS_CN.includes(String(rolGlobal || '').toUpperCase());
  const [menu, setMenu] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargandoMenu, setCargandoMenu] = useState(true);
  const [cargandoNotificaciones, setCargandoNotificaciones] = useState(true);
  const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
  const [errorMenu, setErrorMenu] = useState('');
  const [errorNotificaciones, setErrorNotificaciones] = useState('');

  const noLeidas = notificaciones.filter((notificacion) => !notificacion.leida).length;
  const mostrarMenuEmpresarial = !esUsuarioInternoCn && tieneAccesoEmpresarial;
  const puedeVerAdmin = esAdminCn || tieneAccesoEmpresarial || esUsuarioInternoCn;
  const menuInterno = limpiarMenu([
    { nombre: 'Dashboard', ruta: '/admin', icono: 'dashboard' },
    ...menu,
    { nombre: 'Desarrollos inmobiliarios', ruta: '/admin/desarrollos', icono: 'building' },
    { nombre: 'Proyectos inmobiliarios', ruta: '/admin/proyectos-inmobiliarios', icono: 'project' },
  ]);
  const menuEmpresarial = limpiarMenu([
    { nombre: 'Proyectos inmobiliarios', ruta: '/admin/proyectos-inmobiliarios', icono: 'project' },
    { nombre: 'Prospectos', ruta: '/admin/proyectos-inmobiliarios/prospectos', icono: 'prospectos' },
    { nombre: 'Apartados', ruta: '/admin/proyectos-inmobiliarios/apartados', icono: 'apartados' },
  ]);

  const cargarNotificaciones = useCallback(async (options = {}) => {
    const { silencioso = false, signal } = options;

    if (!silencioso) {
      setCargandoNotificaciones(true);
    }

    setErrorNotificaciones('');

    try {
      const data = await obtenerNotificaciones({ signal });
      setNotificaciones(data);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setErrorNotificaciones(err.data?.mensaje || err.data?.message || err.message || 'No fue posible cargar notificaciones.');
      }
    } finally {
      if (!signal?.aborted && !silencioso) {
        setCargandoNotificaciones(false);
      }
    }
  }, []);

  useEffect(() => {
    let controller;

    const cargarMenu = async () => {
      if (!esUsuarioInternoCn) {
        setMenu([]);
        setErrorMenu('');
        setCargandoMenu(false);
        return;
      }

      controller = new AbortController();
      setCargandoMenu(true);
      setErrorMenu('');

      try {
        const data = await obtenerMenu({ signal: controller.signal });
        setMenu(limpiarMenu(data));
      } catch (err) {
        if (err.name !== 'AbortError') {
          setErrorMenu(err.data?.mensaje || err.data?.message || err.message || 'No fue posible cargar el menu.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargandoMenu(false);
        }
      }
    };

    cargarMenu();

    return () => {
      controller?.abort();
    };
  }, [esUsuarioInternoCn]);

  useEffect(() => {
    if (!cargandoSesion && !puedeVerAdmin) {
      navigate('/', { replace: true });
    }
  }, [cargandoSesion, navigate, puedeVerAdmin]);

  useEffect(() => {
    if (!cargandoSesion && mostrarMenuEmpresarial && location.pathname === '/admin') {
      navigate('/admin/proyectos-inmobiliarios', { replace: true });
    }
  }, [cargandoSesion, location.pathname, mostrarMenuEmpresarial, navigate]);

  useEffect(() => {
    const controller = new AbortController();
    cargarNotificaciones({ signal: controller.signal });

    return () => controller.abort();
  }, [cargarNotificaciones]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      cargarNotificaciones({ silencioso: true });
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, [cargarNotificaciones]);

  const salir = () => {
    cerrarSesion();
    navigate('/login', { replace: true });
  };

  const navegarNotificacion = async (notificacion) => {
    try {
      if (!notificacion.leida) {
        await marcarNotificacionLeida(notificacion.id);
        setNotificaciones((actuales) =>
          actuales.map((item) =>
            item.id === notificacion.id
              ? { ...item, leida: true }
              : item
          )
        );
      }

      setNotificacionesAbiertas(false);

      if (notificacion.url) {
        navigate(notificacion.url);
      }
    } catch (err) {
      setErrorNotificaciones(err.data?.mensaje || err.data?.message || err.message || 'No fue posible marcar la notificacion.');
    }
  };

  const marcarTodas = async () => {
    try {
      await marcarTodasNotificacionesLeidas();
      setNotificaciones((actuales) => actuales.map((item) => ({ ...item, leida: true })));
      setErrorNotificaciones('');
    } catch (err) {
      setErrorNotificaciones(err.data?.mensaje || err.data?.message || err.message || 'No fue posible marcar notificaciones.');
    }
  };

  return (
    <div className="admin-layout">
      <nav className="admin-nav" aria-label="Navegacion administrativa">
        <div>
          <p className="admin-nav-eyebrow">CN Inmobiliaria</p>
          <strong>Administracion</strong>
        </div>
        <div className="admin-nav-links">
          <div className="admin-notificaciones">
            <button
              type="button"
              className="admin-notificaciones-trigger"
              onClick={() => setNotificacionesAbiertas((actual) => !actual)}
              aria-label="Notificaciones"
            >
              <FaBell aria-hidden="true" />
              {noLeidas > 0 ? <span>{noLeidas}</span> : null}
            </button>
            {notificacionesAbiertas ? (
              <div className="admin-notificaciones-panel">
                <div className="admin-notificaciones-head">
                  <strong>Notificaciones</strong>
                  <button type="button" onClick={marcarTodas} disabled={noLeidas === 0}>
                    Marcar todas como leidas
                  </button>
                </div>
                {cargandoNotificaciones ? <p>Cargando notificaciones...</p> : null}
                {errorNotificaciones ? <p className="is-error">{errorNotificaciones}</p> : null}
                {!cargandoNotificaciones && !errorNotificaciones && notificaciones.length === 0 ? (
                  <p>Sin notificaciones</p>
                ) : null}
                {!cargandoNotificaciones && notificaciones.length > 0 ? (
                  <div className="admin-notificaciones-list">
                    {notificaciones.slice(0, 10).map((notificacion) => (
                      <button
                        key={notificacion.id}
                        type="button"
                        className={notificacion.leida ? 'is-read' : 'is-unread'}
                        onClick={() => navegarNotificacion(notificacion)}
                      >
                        <strong>{notificacion.titulo}</strong>
                        {notificacion.mensaje ? <span>{resumirTexto(notificacion.mensaje)}</span> : null}
                        {(notificacion.fechaRaw || notificacion.fecha) ? (
                          <small>{formatearFechaRelativa(notificacion.fechaRaw || notificacion.fecha)}</small>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          {cargandoSesion || (esUsuarioInternoCn && cargandoMenu) ? <span className="admin-nav-status">Cargando menu...</span> : null}
          {esUsuarioInternoCn && errorMenu ? <span className="admin-nav-status is-error">{errorMenu}</span> : null}
          {!cargandoSesion && !puedeVerAdmin ? (
            <span className="admin-nav-status is-error">No tienes permiso para acceder a esta sección.</span>
          ) : null}
          {!cargandoSesion && esUsuarioInternoCn && !cargandoMenu && !errorMenu ? (
            <>
              {menuInterno.map((item) => (
                <MenuItem key={item.menuId || item.ruta || item.nombre} item={item} />
              ))}
              {esAdminCn ? (
                <NavLink to="/admin/empresas-inmobiliarias">
                  <MenuIcon icono="building" />
                  <span>Empresas inmobiliarias</span>
                </NavLink>
              ) : null}
              {esAdminCn ? (
                <NavLink to="/admin/estadisticas">
                  <MenuIcon icono="chart" />
                  <span>Estadisticas</span>
                </NavLink>
              ) : null}
              {esAdminCn ? (
                <NavLink to="/admin/catalogos">
                  <MenuIcon icono="folderopen" />
                  <span>Catalogos</span>
                </NavLink>
              ) : null}
              {esAdminCn ? (
                <NavLink to="/admin/configuracion">
                  <MenuIcon icono="configuracion" />
                  <span>Configuracion</span>
                </NavLink>
              ) : null}
              {esAdminCn ? (
                <NavLink to="/admin/usuarios">
                  <MenuIcon icono="usuarios" />
                  <span>Usuarios</span>
                </NavLink>
              ) : null}
            </>
          ) : null}
          {!cargandoSesion && mostrarMenuEmpresarial ? (
            <>
              {menuEmpresarial.map((item) => (
                <MenuItem key={item.menuId || item.ruta || item.nombre} item={item} />
              ))}
            </>
          ) : null}
          <Link to="/">
            <MenuIcon icono="arrowleft" />
            <span>Volver al sitio</span>
          </Link>
          <button type="button" onClick={salir}>
            <MenuIcon icono="signout" />
            <span>Cerrar sesion</span>
          </button>
        </div>
      </nav>
      {!cargandoSesion && puedeVerAdmin ? <Outlet /> : null}
    </div>
  );
}
