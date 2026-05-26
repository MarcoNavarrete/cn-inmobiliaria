import React from 'react';
import { trackEvent } from '../lib/analytics';
import { trackMetaCustomEvent, trackMetaEvent } from '../lib/metaPixel';
import './Contacto.css';

const whatsappNumber = '5217716707794';
const phoneNumber = '7717581695';

// Dirección mostrada al usuario como referencia.
// El mapa usa coordenadas exactas para evitar errores de geolocalización por dirección.
const officeAddress = 'Calle Mariano Abasolo #23, Col. Centro, Pachuca, Hidalgo';
const officeLat = 20.126249;
const officeLng = -98.740774;

const mapsUrl = `https://www.google.com/maps?q=${officeLat},${officeLng}&z=19&output=embed`;
const mapsLink = `https://www.google.com/maps/search/?api=1&query=${officeLat},${officeLng}`;

export default function Contacto() {
  return (
    <section id="contacto" className="contacto" data-aos="fade-up" data-aos-duration="1200">
      <div className="contacto-shell">
        <div className="contacto-head">
          <p>Contactanos</p>
          <h2>Agenda una asesoria para encontrar tu siguiente propiedad</h2>
        </div>

        <div className="contacto-contenido">
          <div className="info">
            <div className="info-item">
              <span>Oficina</span>
              <strong>{officeAddress}</strong>
            </div>
            <div className="info-item">
              <span>Telefono</span>
              <strong>(771) 758 1695</strong>
            </div>
            <div className="info-item">
              <span>WhatsApp</span>
              <strong>771 670 7794</strong>
            </div>
            <div className="info-item">
              <span>Correo</span>
              <strong>Correo por confirmar</strong>
            </div>
            <div className="info-item">
              <span>Horario</span>
              <strong>Lunes a viernes - 9:00 a.m. a 6:00 p.m.</strong>
            </div>

            <div className="contacto-acciones">
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  trackEvent('click_whatsapp', { source: 'contacto' });
                  trackMetaEvent('Contact', {
                    content_name: 'Contacto principal',
                    content_category: 'WhatsApp',
                    content_type: 'contacto',
                  });
                }}
              >
                Enviar WhatsApp
              </a>
              <a href={`tel:${phoneNumber}`}>Llamar</a>
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  trackEvent('click_mapa_interactivo', { source: 'contacto' });
                  trackMetaCustomEvent('ClickMapaInteractivo', {
                    content_name: 'Contacto principal',
                    content_category: 'Mapa',
                    content_type: 'contacto',
                  });
                }}
              >
                Ver ubicación
              </a>
            </div>
          </div>

          <div className="mapa">
            <iframe
              title="Mapa de ubicación de CN Inmobiliaria"
              src={mapsUrl}
              width="100%"
              height="420"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
