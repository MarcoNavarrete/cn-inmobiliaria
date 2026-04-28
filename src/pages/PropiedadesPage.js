import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import FiltrosPropiedadesPublicas, {
  FILTROS_INICIALES,
} from '../components/FiltrosPropiedadesPublicas';
import ListadoPropiedadesPublicas from '../components/ListadoPropiedadesPublicas';

const QUERY_TO_FORM = {
  EstadoId: 'estadoId',
  PoblacionId: 'poblacionId',
  LocalidadId: 'localidadId',
  TipoInmueble: 'tipoInmueble',
  PrecioMin: 'precioMin',
  PrecioMax: 'precioMax',
};

const FORM_TO_QUERY = {
  estadoId: 'EstadoId',
  poblacionId: 'PoblacionId',
  localidadId: 'LocalidadId',
  tipoInmueble: 'TipoInmueble',
  precioMin: 'PrecioMin',
  precioMax: 'PrecioMax',
};

const buildFormFiltersFromSearchParams = (searchParams) => ({
  estadoId: searchParams.get('EstadoId') || '',
  poblacionId: searchParams.get('PoblacionId') || '',
  localidadId: searchParams.get('LocalidadId') || '',
  tipoInmueble: searchParams.get('TipoInmueble') || '',
  precioMin: searchParams.get('PrecioMin') || '',
  precioMax: searchParams.get('PrecioMax') || '',
});

const buildApiFiltersFromSearchParams = (searchParams) => {
  const filtros = {};

  Object.keys(QUERY_TO_FORM).forEach((queryKey) => {
    const value = searchParams.get(queryKey);

    if (value) {
      filtros[queryKey] = value;
    }
  });

  return filtros;
};

export default function PropiedadesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filtrosFormulario = useMemo(
    () => buildFormFiltersFromSearchParams(searchParams),
    [searchParams]
  );

  const filtrosApi = useMemo(
    () => buildApiFiltersFromSearchParams(searchParams),
    [searchParams]
  );

  const aplicarFiltros = (filtrosFormularioActualizados) => {
    const nextParams = new URLSearchParams();
    const filtrosNormalizados = {
      ...FILTROS_INICIALES,
      ...filtrosFormularioActualizados,
    };

    Object.entries(filtrosNormalizados).forEach(([formKey, value]) => {
      if (value) {
        nextParams.set(FORM_TO_QUERY[formKey], value);
      }
    });

    setSearchParams(nextParams);
  };

  return (
    <ListadoPropiedadesPublicas
      titulo="Listado de propiedades"
      filtros={filtrosApi}
      mostrarFiltros={true}
      filtrosSlot={
        <FiltrosPropiedadesPublicas
          initialFilters={filtrosFormulario}
          onApplyFilters={aplicarFiltros}
        />
      }
    />
  );
}
