const ROLES_ADMIN_CN = ['ADMIN', 'SUPERADMIN'];
const ROLES_VENTA_EMPRESA = ['ADMIN_EMPRESA', 'VENDEDOR', 'LECTURA'];

const getRolGlobal = (session = {}) =>
  String(session.rolGlobal || session.rol || session.usuario?.rolGlobal || session.usuario?.rol || '').toUpperCase();

const getEmpresas = (session = {}) => (Array.isArray(session.empresas) ? session.empresas : []);

const getRolEmpresa = (empresa = {}) =>
  String(empresa.rolEmpresa || empresa.rol || empresa.rolUsuario || empresa.tipoRol || '').toUpperCase();

const getEmpresasActivas = (session = {}) =>
  getEmpresas(session).filter((empresa) => empresa?.activo !== false && empresa?.esActivo !== false);

export const esAdminCn = (session = {}) =>
  Boolean(session.esAdminCn) || ROLES_ADMIN_CN.includes(getRolGlobal(session));

export const tieneRolEmpresa = (session = {}, rolEmpresa) =>
  getEmpresasActivas(session).some((empresa) => getRolEmpresa(empresa) === String(rolEmpresa || '').toUpperCase());

export const obtenerRolEmpresaPrincipal = (session = {}) => {
  const roles = getEmpresasActivas(session).map((empresa) => getRolEmpresa(empresa));

  if (roles.includes('ADMIN_EMPRESA')) return 'ADMIN_EMPRESA';
  if (roles.includes('VENDEDOR')) return 'VENDEDOR';
  if (roles.includes('LECTURA')) return 'LECTURA';
  return '';
};

export const tieneAccesoEmpresarial = (session = {}) =>
  Boolean(session.tieneAccesoEmpresarial || getEmpresasActivas(session).length > 0);

export const puedePublicarPropiedades = (session = {}) =>
  Boolean(
    session.puedePublicarPropiedades ||
    session.puedePublicar ||
    esAdminCn(session) ||
    getRolGlobal(session) === 'ASESOR'
  );

export const puedeCrearProyecto = (session = {}) =>
  Boolean(
    session.puedeCrearProyectos ||
    esAdminCn(session) ||
    tieneRolEmpresa(session, 'ADMIN_EMPRESA')
  );

export const puedeEditarProyecto = (session = {}) =>
  Boolean(
    session.puedeCrearProyectos ||
    session.puedeAdministrarEmpresa ||
    esAdminCn(session) ||
    tieneRolEmpresa(session, 'ADMIN_EMPRESA')
  );

export const puedeEditarUnidades = (session = {}) =>
  Boolean(
    session.puedeCrearProyectos ||
    session.puedeAdministrarEmpresa ||
    esAdminCn(session) ||
    tieneRolEmpresa(session, 'ADMIN_EMPRESA')
  );

export const puedeEditarModelos = (session = {}) =>
  Boolean(
    session.puedeCrearProyectos ||
    session.puedeAdministrarEmpresa ||
    esAdminCn(session) ||
    tieneRolEmpresa(session, 'ADMIN_EMPRESA')
  );

export const puedeSubirPlano = (session = {}) =>
  Boolean(
    session.puedeCrearProyectos ||
    session.puedeAdministrarEmpresa ||
    esAdminCn(session) ||
    tieneRolEmpresa(session, 'ADMIN_EMPRESA')
  );

export const puedeSubirImagenes = (session = {}) =>
  Boolean(
    session.puedeCrearProyectos ||
    session.puedeAdministrarEmpresa ||
    esAdminCn(session) ||
    tieneRolEmpresa(session, 'ADMIN_EMPRESA')
  );

export const puedeImportarCsv = (session = {}) =>
  Boolean(
    session.puedeCrearProyectos ||
    session.puedeAdministrarEmpresa ||
    esAdminCn(session) ||
    tieneRolEmpresa(session, 'ADMIN_EMPRESA')
  );

export const puedeOperarProspectos = (session = {}) =>
  Boolean(
    session.puedeAdministrarEmpresa ||
    esAdminCn(session) ||
    ROLES_VENTA_EMPRESA.some((rol) => tieneRolEmpresa(session, rol))
  );

export const puedeOperarApartados = (session = {}) =>
  Boolean(
    session.puedeAdministrarEmpresa ||
    esAdminCn(session) ||
    ROLES_VENTA_EMPRESA.some((rol) => tieneRolEmpresa(session, rol))
  );

export const soloLectura = (session = {}) =>
  !esAdminCn(session) && tieneRolEmpresa(session, 'LECTURA');

export const puedeEditarContenidoProyecto = (session = {}) =>
  puedeEditarProyecto(session);
