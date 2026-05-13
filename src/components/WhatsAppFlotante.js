import React from 'react';
import './WhatsAppFlotante.css';

export default function WhatsAppFlotante() {
  const numeroWhatsApp = '5215540859798';

  return (
    <div className="whatsapp-flotante">
      <a
        href={`https://wa.me/${numeroWhatsApp}`}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-icono"
        aria-label="Enviar mensaje por WhatsApp"
      >
        <span className="tooltip">Tu nuevo hogar esta a un mensaje</span>
        <img src="./assets/whatsapp.png" alt="" />
      </a>
    </div>
  );
}
