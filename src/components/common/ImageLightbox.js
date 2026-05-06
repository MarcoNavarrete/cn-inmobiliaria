import React, { useEffect, useState } from 'react';
import './ImageLightbox.css';

export default function ImageLightbox({
  images = [],
  initialIndex = 0,
  isOpen = false,
  onClose,
  title = 'Imagen',
}) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const validImages = images.filter(Boolean);
  const hasMultiple = validImages.length > 1;

  useEffect(() => {
    if (isOpen) {
      setActiveIndex(Math.min(initialIndex, Math.max(validImages.length - 1, 0)));
    }
  }, [initialIndex, isOpen, validImages.length]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }

      if (event.key === 'ArrowLeft' && hasMultiple) {
        setActiveIndex((actual) => (actual - 1 + validImages.length) % validImages.length);
      }

      if (event.key === 'ArrowRight' && hasMultiple) {
        setActiveIndex((actual) => (actual + 1) % validImages.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasMultiple, isOpen, onClose, validImages.length]);

  if (!isOpen || validImages.length === 0) {
    return null;
  }

  const move = (direction) => {
    setActiveIndex((actual) => (actual + direction + validImages.length) % validImages.length);
  };

  return (
    <div className="image-lightbox" role="presentation" onMouseDown={onClose}>
      <section
        className="image-lightbox-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="image-lightbox-head">
          <div>
            <strong>{title}</strong>
            <span>{activeIndex + 1} / {validImages.length}</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar imagen">Cerrar</button>
        </header>

        <div className="image-lightbox-stage">
          {hasMultiple ? (
            <button type="button" className="image-lightbox-nav is-prev" onClick={() => move(-1)} aria-label="Imagen anterior">
              Anterior
            </button>
          ) : null}
          <img src={validImages[activeIndex]} alt={title} />
          {hasMultiple ? (
            <button type="button" className="image-lightbox-nav is-next" onClick={() => move(1)} aria-label="Imagen siguiente">
              Siguiente
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
