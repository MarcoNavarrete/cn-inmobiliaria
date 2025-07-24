// src/components/WhatsAppFlotante.js
import React from 'react';
import './WhatsAppFlotante.css';

export default function WhatsAppFlotante() {
  const numeroWhatsApp = '+5215540859798'; // Asegúrate que incluya "521" (México) + número

  return (
    <div className="whatsapp-flotante">
      <a
        href={`https://wa.me/${numeroWhatsApp}`}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-icono"
      >
        <span className="tooltip">Tu nuevo hogar está a un mensaje de distancia</span>
        <img src="./assets/whatsapp.png" alt="WhatsApp" />
      </a>
    </div>
  );
}
