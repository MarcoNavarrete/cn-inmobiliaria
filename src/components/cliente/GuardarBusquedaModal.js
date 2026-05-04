import React, { useEffect, useState } from 'react';
import { crearBusquedaGuardada } from '../../services/misBusquedasService';
import './GuardarBusquedaModal.css';

const normalizarTexto = (value) => {
  const text = String(value || '').trim();
  return text || null;
};

const normalizarNumero = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numero = Number(value);
  return Number.isNaN(numero) ? null : numero;
};

const construirPayload = (nombre, filtrosActuales = {}) => ({
  nombre: String(nombre || '').trim(),
  estadoId: normalizarTexto(filtrosActuales.estadoId),
  poblacionId: normalizarTexto(filtrosActuales.poblacionId),
  localidadId: normalizarTexto(filtrosActuales.localidadId),
  tipoInmueble: normalizarTexto(filtrosActuales.tipoInmueble),
  precioMin: normalizarNumero(filtrosActuales.precioMin),
  precioMax: normalizarNumero(filtrosActuales.precioMax),
});

export default function GuardarBusquedaModal({
  filtrosActuales = {},
  isOpen,
  onClose,
  onSaved,
  show,
}) {
  const abierto = isOpen ?? show;
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (abierto) {
      setNombre('');
      setError('');
      setGuardando(false);
    }
  }, [abierto]);

  if (!abierto) {
    return null;
  }

  const guardar = async (event) => {
    event.preventDefault();
    const payload = construirPayload(nombre, filtrosActuales);

    if (!payload.nombre) {
      setError('Escribe un nombre para guardar la busqueda.');
      return;
    }

    setGuardando(true);
    setError('');

    try {
      const data = await crearBusquedaGuardada(payload);
      onSaved?.(data);
      onClose?.();
    } catch (err) {
      setError(err.data?.mensaje || err.data?.message || 'No fue posible guardar la busqueda.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="guardar-busqueda-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="guardar-busqueda-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guardar-busqueda-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="guardar-busqueda-head">
          <div>
            <p>Cliente</p>
            <h2 id="guardar-busqueda-title">Guardar busqueda</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            x
          </button>
        </div>

        <form className="guardar-busqueda-form" onSubmit={guardar}>
          <label>
            <span>Nombre de la busqueda</span>
            <input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              disabled={guardando}
              maxLength="120"
              placeholder="Ej. Casas en Pachuca hasta $2M"
              required
            />
          </label>

          {error ? <p className="guardar-busqueda-error">{error}</p> : null}

          <div className="guardar-busqueda-actions">
            <button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar busqueda'}
            </button>
            <button type="button" onClick={onClose} disabled={guardando}>
              Cancelar
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
