import React, { useEffect, useState } from 'react';
import './FiltrosPropiedadesPublicas.css';
import {
  obtenerEstados,
  obtenerLocalidades,
  obtenerPoblaciones,
} from '../services/catalogosService';

export const FILTROS_INICIALES = {
  estadoId: '',
  poblacionId: '',
  localidadId: '',
  tipoInmueble: '',
  precioMin: '',
  precioMax: '',
};

const TIPOS_INMUEBLE = [
  { value: '', label: 'Todos' },
  { value: 'casa', label: 'Casa' },
  { value: 'terreno', label: 'Terreno' },
  { value: 'departamento', label: 'Departamento' },
  { value: 'local', label: 'Local' },
  { value: 'oficina', label: 'Oficina' },
];

const normalizarFiltros = (filtros = {}) => ({
  estadoId: filtros.estadoId || '',
  poblacionId: filtros.poblacionId || '',
  localidadId: filtros.localidadId || '',
  tipoInmueble: filtros.tipoInmueble || '',
  precioMin: filtros.precioMin || '',
  precioMax: filtros.precioMax || '',
});

export default function FiltrosPropiedadesPublicas({
  onApplyFilters,
  initialFilters = FILTROS_INICIALES,
}) {
  const [filtros, setFiltros] = useState(normalizarFiltros(initialFilters));
  const [estados, setEstados] = useState([]);
  const [poblaciones, setPoblaciones] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);
  const [catalogosError, setCatalogosError] = useState('');

  useEffect(() => {
    setFiltros(normalizarFiltros(initialFilters));
  }, [initialFilters]);

  useEffect(() => {
    const controller = new AbortController();

    const cargarEstados = async () => {
      try {
        setLoadingCatalogos(true);
        setCatalogosError('');
        const data = await obtenerEstados({ signal: controller.signal });
        if (process.env.NODE_ENV === 'development') {
          console.log('[Filtros] estados normalizados', data);
        }
        setEstados(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setCatalogosError('No fue posible cargar los filtros de ubicacion.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingCatalogos(false);
        }
      }
    };

    cargarEstados();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!filtros.estadoId) {
      setPoblaciones([]);
      setLocalidades([]);
      return;
    }

    const controller = new AbortController();

    const cargarPoblaciones = async () => {
      try {
        setCatalogosError('');
        const data = await obtenerPoblaciones(filtros.estadoId, {
          signal: controller.signal,
        });
        setPoblaciones(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setCatalogosError('No fue posible cargar las poblaciones.');
          setPoblaciones([]);
        }
      }
    };

    cargarPoblaciones();

    return () => controller.abort();
  }, [filtros.estadoId]);

  useEffect(() => {
    if (!filtros.estadoId || !filtros.poblacionId) {
      setLocalidades([]);
      return;
    }

    const controller = new AbortController();

    const cargarLocalidades = async () => {
      try {
        setCatalogosError('');
        const data = await obtenerLocalidades(filtros.estadoId, filtros.poblacionId, {
          signal: controller.signal,
        });
        setLocalidades(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setCatalogosError('No fue posible cargar las localidades.');
          setLocalidades([]);
        }
      }
    };

    cargarLocalidades();

    return () => controller.abort();
  }, [filtros.estadoId, filtros.poblacionId]);

  const actualizarFiltro = (event) => {
    const { name, value } = event.target;

    setFiltros((prev) => {
      if (name === 'estadoId') {
        return {
          ...prev,
          estadoId: value,
          poblacionId: '',
          localidadId: '',
        };
      }

      if (name === 'poblacionId') {
        return {
          ...prev,
          poblacionId: value,
          localidadId: '',
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const aplicarFiltros = (event) => {
    event.preventDefault();

    onApplyFilters({
      estadoId: filtros.estadoId,
      poblacionId: filtros.poblacionId,
      localidadId: filtros.localidadId,
      tipoInmueble: filtros.tipoInmueble,
      precioMin: filtros.precioMin,
      precioMax: filtros.precioMax,
    });
  };

  const limpiarFiltros = () => {
    setFiltros(FILTROS_INICIALES);
    setPoblaciones([]);
    setLocalidades([]);
    setCatalogosError('');
    onApplyFilters({});
  };

  return (
    <div className="filtros-publicos">
      <form className="filtros-grid" onSubmit={aplicarFiltros}>
        <div className="campo-filtro">
          <label htmlFor="estadoId">Estado</label>
          <select
            id="estadoId"
            name="estadoId"
            value={filtros.estadoId}
            onChange={actualizarFiltro}
            disabled={loadingCatalogos}
          >
            <option value="">Todos</option>
            {estados.map((estado) => (
              <option key={estado.id} value={estado.id}>
                {estado.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="campo-filtro">
          <label htmlFor="poblacionId">Poblacion / municipio</label>
          <select
            id="poblacionId"
            name="poblacionId"
            value={filtros.poblacionId}
            onChange={actualizarFiltro}
            disabled={!filtros.estadoId}
          >
            <option value="">Todos</option>
            {poblaciones.map((poblacion) => (
              <option key={poblacion.id} value={poblacion.id}>
                {poblacion.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="campo-filtro">
          <label htmlFor="localidadId">Localidad / colonia</label>
          <select
            id="localidadId"
            name="localidadId"
            value={filtros.localidadId}
            onChange={actualizarFiltro}
            disabled={!filtros.estadoId || !filtros.poblacionId}
          >
            <option value="">Todas</option>
            {localidades.map((localidad) => (
              <option key={localidad.id} value={localidad.id}>
                {localidad.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="campo-filtro">
          <label htmlFor="tipoInmueble">Tipo de inmueble</label>
          <select
            id="tipoInmueble"
            name="tipoInmueble"
            value={filtros.tipoInmueble}
            onChange={actualizarFiltro}
          >
            {TIPOS_INMUEBLE.map((tipo) => (
              <option key={tipo.value || 'todos'} value={tipo.value}>
                {tipo.label}
              </option>
            ))}
          </select>
        </div>

        <div className="campo-filtro">
          <label htmlFor="precioMin">Precio minimo</label>
          <input
            id="precioMin"
            name="precioMin"
            type="number"
            min="0"
            step="1000"
            value={filtros.precioMin}
            onChange={actualizarFiltro}
            placeholder="Desde"
          />
        </div>

        <div className="campo-filtro">
          <label htmlFor="precioMax">Precio maximo</label>
          <input
            id="precioMax"
            name="precioMax"
            type="number"
            min="0"
            step="1000"
            value={filtros.precioMax}
            onChange={actualizarFiltro}
            placeholder="Hasta"
          />
        </div>

        <div className="acciones-filtros">
          <button type="submit" className="btn-filtro btn-filtro-primario">
            Aplicar filtros
          </button>
          <button
            type="button"
            className="btn-filtro btn-filtro-secundario"
            onClick={limpiarFiltros}
          >
            Limpiar
          </button>
        </div>
      </form>

      {catalogosError ? <p className="filtros-mensaje-error">{catalogosError}</p> : null}
    </div>
  );
}
