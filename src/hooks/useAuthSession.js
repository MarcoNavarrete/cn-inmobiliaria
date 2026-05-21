import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser, obtenerSesionActual, obtenerToken } from '../services/authService';

export default function useAuthSession() {
  const [sesion, setSesion] = useState(() => getCurrentUser());
  const [cargando, setCargando] = useState(Boolean(obtenerToken()));

  const recargarSesion = useCallback(async (options = {}) => {
    const token = obtenerToken();

    if (!token) {
      setSesion(null);
      setCargando(false);
      return null;
    }

    setCargando(true);

    try {
      const data = await obtenerSesionActual({
        forceRefresh: options.forceRefresh ?? true,
        signal: options.signal,
        suppressForbiddenAlert: options.suppressForbiddenAlert ?? true,
      });
      setSesion(data || getCurrentUser());
      return data;
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const actualizar = () => setSesion(getCurrentUser());
    window.addEventListener('auth-change', actualizar);
    window.addEventListener('auth-session-change', actualizar);

    if (obtenerToken()) {
      recargarSesion({ forceRefresh: true });
    } else {
      setCargando(false);
    }

    return () => {
      window.removeEventListener('auth-change', actualizar);
      window.removeEventListener('auth-session-change', actualizar);
    };
  }, [recargarSesion]);

  return {
    sesion,
    cargando,
    recargarSesion,
    usuario: sesion,
    usuarioId: sesion?.usuarioId || '',
    email: sesion?.email || '',
    nombre: sesion?.nombre || '',
    rolGlobal: String(sesion?.rolGlobal || sesion?.rol || '').toUpperCase(),
    esAdminCn: Boolean(sesion?.esAdminCn),
    tieneAccesoEmpresarial: Boolean(sesion?.tieneAccesoEmpresarial),
    puedePublicarPropiedades: Boolean(sesion?.puedePublicarPropiedades),
    puedeCrearProyectos: Boolean(sesion?.puedeCrearProyectos),
    puedeAdministrarEmpresa: Boolean(sesion?.puedeAdministrarEmpresa),
    empresas: Array.isArray(sesion?.empresas) ? sesion.empresas : [],
  };
}
