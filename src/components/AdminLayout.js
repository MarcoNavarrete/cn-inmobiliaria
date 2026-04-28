import React, { useEffect, useState } from 'react';
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

    const cargarNotificaciones = async () => {
      setCargandoNotificaciones(true);
      setErrorNotificaciones('');

      try {
        const data = await obtenerNotificaciones({ signal: controller.signal });
        setNotificaciones(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setErrorNotificaciones(err.data?.mensaje || err.data?.message || err.message || 'No fue posible cargar notificaciones.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargandoNotificaciones(false);
        }
      }
    };

    cargarNotificaciones();

    return () => controller.abort();
  }, []);

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
                  <p>No hay notificaciones.</p>
                ) : null}
                {!cargandoNotificaciones && notificaciones.length > 0 ? (
                  <div className="admin-notificaciones-list">
                    {notificaciones.slice(0, 8).map((notificacion) => (
                      <button
                        key={notificacion.id}
                        type="button"
                        className={notificacion.leida ? 'is-read' : 'is-unread'}
                        onClick={() => navegarNotificacion(notificacion)}
                      >
                        <strong>{notificacion.titulo}</strong>
                        {notificacion.mensaje ? <span>{notificacion.mensaje}</span> : null}
                        {notificacion.fecha ? <small>{notificacion.fecha}</small> : null}
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

