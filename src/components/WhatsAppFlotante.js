import React from 'react';
import { trackEvent } from '../lib/analytics';
import { getWhatsAppPhone } from '../config/contacto';
import { trackMetaEvent } from '../lib/metaPixel';
import './WhatsAppFlotante.css';

export default function WhatsAppFlotante() {
  const numeroWhatsApp = getWhatsAppPhone();

  return (
    <div className="whatsapp-flotante">
      <a
        href={`https://wa.me/${numeroWhatsApp}`}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-icono"
        aria-label="Enviar mensaje por WhatsApp"
        onClick={() => {
          trackEvent('click_whatsapp', { source: 'whatsapp_flotante' });
          trackMetaEvent('Contact', {
            content_name: 'WhatsApp flotante',
            content_category: 'WhatsApp',
            content_type: 'contacto',
          });
        }}
      >
        <span className="tooltip">Tu nuevo hogar esta a un mensaje</span>
        <img src="./assets/whatsapp.png" alt="" />
      </a>
    </div>
  );
}
