import { useMemo } from 'react';
import useAuthSession from './useAuthSession';
import {
  esAdminCn as esAdminCnHelper,
  obtenerRolEmpresaPrincipal,
  tieneAccesoEmpresarial as tieneAccesoEmpresarialHelper,
  puedeCrearProyecto as puedeCrearProyectoHelper,
  puedeEditarProyecto as puedeEditarProyectoHelper,
  puedeEditarContenidoProyecto as puedeEditarContenidoProyectoHelper,
  puedeEditarUnidades as puedeEditarUnidadesHelper,
  puedeEditarModelos as puedeEditarModelosHelper,
  puedeSubirPlano as puedeSubirPlanoHelper,
  puedeSubirImagenes as puedeSubirImagenesHelper,
  puedeImportarCsv as puedeImportarCsvHelper,
  puedeOperarProspectos as puedeOperarProspectosHelper,
  puedeOperarApartados as puedeOperarApartadosHelper,
  soloLectura as soloLecturaHelper,
} from '../utils/permisosProyecto';

const ROLES_INTERNOS_CN = ['ASESOR', 'SUPERVISOR', 'ADMIN', 'SUPERADMIN'];

export default function usePermisosEmpresa() {
  const sesion = useAuthSession();
  const rolGlobal = String(sesion.rolGlobal || sesion.usuario?.rolGlobal || sesion.usuario?.rol || '').toUpperCase();
  const esInternoCn = ROLES_INTERNOS_CN.includes(rolGlobal);
  const esAdminCn = esAdminCnHelper(sesion);
  const tieneEmpresa = tieneAccesoEmpresarialHelper(sesion);
  const rolEmpresa = useMemo(() => obtenerRolEmpresaPrincipal(sesion), [sesion]);

  return {
    cargando: sesion.cargando,
    usuario: sesion.usuario,
    rolGlobal,
    rolEmpresa,
    empresas: sesion.empresas,
    esInternoCn,
    esAdminCn,
    tieneEmpresa,
    puedeAccederProyectos: esAdminCn || tieneEmpresa,
    puedeCrearProyecto: puedeCrearProyectoHelper(sesion),
    puedeEditarProyecto: puedeEditarProyectoHelper(sesion),
    puedeEditarContenidoProyecto: puedeEditarContenidoProyectoHelper(sesion),
    puedeEditarUnidades: puedeEditarUnidadesHelper(sesion),
    puedeEditarModelos: puedeEditarModelosHelper(sesion),
    puedeSubirPlano: puedeSubirPlanoHelper(sesion),
    puedeSubirImagenes: puedeSubirImagenesHelper(sesion),
    puedeImportarCsv: puedeImportarCsvHelper(sesion),
    puedeOperarProspectos: puedeOperarProspectosHelper(sesion),
    puedeOperarApartados: puedeOperarApartadosHelper(sesion),
    puedeOperarComercial: puedeOperarProspectosHelper(sesion) || puedeOperarApartadosHelper(sesion),
    soloLectura: soloLecturaHelper(sesion),
  };
}
