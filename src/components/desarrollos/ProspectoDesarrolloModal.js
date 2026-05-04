import React, { useEffect, useMemo, useState } from 'react';
import { crearProspectoDesarrollo } from '../../services/desarrollosService';
import './ProspectoDesarrolloModal.css';

const FORM_INICIAL = {
  nombre: '',
  telefono: '',
  email: '',
  mensaje: '',
};

const getErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible registrar tu solicitud.';

export default function ProspectoDesarrolloModal({
  desarrollo,
  isOpen,
  modelo = null,
  onClose,
  onSuccess,
  origen,
}) {
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [puedeAbrirWhatsapp, setPuedeAbrirWhatsapp] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({
        ...FORM_INICIAL,
        mensaje: modelo
          ? `Me interesa el modelo ${modelo.nombre} del desarrollo ${desarrollo?.nombre || ''}.`
          : `Me interesa el desarrollo ${desarrollo?.nombre || ''}.`,
      });
      setError('');
      setPuedeAbrirWhatsapp(false);
      setGuardando(false);
    }
  }, [desarrollo?.nombre, isOpen, modelo]);

  const titulo = useMemo(
    () => (modelo ? `Me interesa ${modelo.nombre}` : 'Solicitar informacion'),
    [modelo]
  );

  if (!isOpen) {
    return null;
  }

  const actualizarCampo = (event) => {
    const { name, value } = event.target;
    setForm((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

  const abrirWhatsapp = () => {
    onSuccess?.({ desarrollo, modelo });
    onClose?.();
  };

  const guardar = async (event) => {
    event.preventDefault();
    setError('');
    setPuedeAbrirWhatsapp(false);

    const nombre = form.nombre.trim();
    const telefono = form.telefono.trim();
    const email = form.email.trim();
    const mensaje = form.mensaje.trim();

    if (!nombre || !telefono) {
      setError('Nombre y telefono son requeridos.');
      return;
    }

    setGuardando(true);

    try {
      await crearProspectoDesarrollo(desarrollo.id, {
        modeloId: modelo?.id || null,
        nombre,
        telefono,
        email,
        mensaje,
        origen,
      });

      abrirWhatsapp();
    } catch (err) {
      setError(`${getErrorMessage(err)} Puedes abrir WhatsApp de todos modos.`);
      setPuedeAbrirWhatsapp(true);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="prospecto-desarrollo-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="prospecto-desarrollo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prospecto-desarrollo-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="prospecto-desarrollo-close"
          onClick={onClose}
          aria-label="Cerrar"
          disabled={guardando}
        >
          x
        </button>

        <div className="prospecto-desarrollo-head">
          <p>{modelo ? 'Modelo disponible' : 'Desarrollo inmobiliario'}</p>
          <h2 id="prospecto-desarrollo-title">{titulo}</h2>
          <span>{desarrollo.nombre}</span>
        </div>

        <form className="prospecto-desarrollo-form" onSubmit={guardar}>
          <label>
            <span>Nombre</span>
            <input
              name="nombre"
              value={form.nombre}
              onChange={actualizarCampo}
              required
              autoFocus
              disabled={guardando}
            />
          </label>

          <label>
            <span>Telefono</span>
            <input
              name="telefono"
              value={form.telefono}
              onChange={actualizarCampo}
              required
              disabled={guardando}
            />
          </label>

          <label>
            <span>Email</span>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={actualizarCampo}
              disabled={guardando}
            />
          </label>

          <label>
            <span>Mensaje</span>
            <textarea
              name="mensaje"
              value={form.mensaje}
              onChange={actualizarCampo}
              rows="4"
              disabled={guardando}
            />
          </label>

          {error ? <p className="prospecto-desarrollo-error">{error}</p> : null}

          <div className="prospecto-desarrollo-actions">
            <button type="submit" disabled={guardando}>
              {guardando ? 'Registrando...' : 'Enviar y abrir WhatsApp'}
            </button>
            {puedeAbrirWhatsapp ? (
              <button type="button" className="is-secondary" onClick={abrirWhatsapp}>
                Abrir WhatsApp
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
