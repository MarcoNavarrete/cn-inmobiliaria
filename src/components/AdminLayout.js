import React, { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  FaBuilding,
  FaBell,
  FaHome,
  FaImages,
  FaTachometerAlt,
} from 'react-icons/fa';
import { cerrarSesion } from '../services/authService';
import { obtenerMenu } from '../services/menuService';
import {
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
  obtenerNotificaciones,
} from '../services/notificacionesService';
import './AdminLayout.css';

const ICONOS_MENU = {
  building: FaBuilding,
  dashboard: FaTachometerAlt,
  home: FaHome,
  image: FaImages,
  images: FaImages,
  inmueble: FaBuilding,
  propiedades: FaBuilding,
  tour: FaImages,
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

const ordenarMenu = (items) =>
  normalizeList(items)
    .filter((item) => item?.activo !== false)
    .map((item) => ({
      ...item,
      children: ordenarMenu(item.children),
    }))
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

const normalizarRuta = (ruta) => {
  if (!ruta) {
    return '/admin';
  }

  return ruta.startsWith('/') ? ruta : `/${ruta}`;
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
  const Icon = ICONOS_MENU[String(icono || '').trim().toLowerCase()];

  if (!Icon) {
    return <span className="admin-nav-icon-fallback" aria-hidden="true">-</span>;
  }

  return <Icon aria-hidden="true" />;
}

function MenuItem({ item }) {
  const children = item.children || [];

  return (
    <div className="admin-nav-item">
      <NavLink to={normalizarRuta(item.ruta)} end={normalizarRuta(item.ruta) === '/admin'}>
        <MenuIcon icono={item.icono} />
        <span>{item.nombre}</span>
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
  const [menu, setMenu] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargandoMenu, setCargandoMenu] = useState(true);
  const [cargandoNotificaciones, setCargandoNotificaciones] = useState(true);
  const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
  const [errorMenu, setErrorMenu] = useState('');
  const [errorNotificaciones, setErrorNotificaciones] = useState('');

  const noLeidas = notificaciones.filter((notificacion) => !notificacion.leida).length;

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
    const controller = new AbortController();

    const cargarMenu = async () => {
      setCargandoMenu(true);
      setErrorMenu('');

      try {
        const data = await obtenerMenu({ signal: controller.signal });
        setMenu(ordenarMenu(data));
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

    return () => controller.abort();
  }, []);

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
          {cargandoMenu ? <span className="admin-nav-status">Cargando menu...</span> : null}
          {errorMenu ? <span className="admin-nav-status is-error">{errorMenu}</span> : null}
          {!cargandoMenu && !errorMenu ? (
            menu.map((item) => (
              <MenuItem key={item.menuId || item.ruta || item.nombre} item={item} />
            ))
          ) : null}
          <Link to="/">Volver al sitio</Link>
          <button type="button" onClick={salir}>Cerrar sesion</button>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}

