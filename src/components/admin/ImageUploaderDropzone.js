import React, { useEffect, useRef, useState } from 'react';
import { resolveApiAssetUrl } from '../../services/apiClient';
import './ImageUploaderDropzone.css';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export default function ImageUploaderDropzone({
  disabled = false,
  onUploaded,
  uploadFile,
}) {
  const inputRef = useRef(null);
  const [archivo, setArchivo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [arrastrando, setArrastrando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  const limpiarPreview = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl('');
  };

  const seleccionarArchivo = (file) => {
    setError('');
    setMensaje('');
    setArchivo(null);
    limpiarPreview();

    if (!file) {
      return;
    }

    if (!IMAGE_TYPES.includes(file.type)) {
      setError('Selecciona una imagen JPG, PNG o WEBP.');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError('La imagen no debe pesar mas de 10MB.');
      return;
    }

    setArchivo(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const manejarDrop = (event) => {
    event.preventDefault();
    setArrastrando(false);
    seleccionarArchivo(event.dataTransfer.files?.[0]);
  };

  const subir = async () => {
    if (disabled || subiendo) {
      return;
    }

    if (!archivo) {
      setError('Selecciona una imagen antes de subir.');
      return;
    }

    setSubiendo(true);
    setError('');
    setMensaje('');

    try {
      const response = await uploadFile(archivo);
      const url = response?.url || response?.Url || '';

      if (!url) {
        throw new Error('El API no devolvio la URL de la imagen.');
      }

      limpiarPreview();
      setPreviewUrl(resolveApiAssetUrl(url));
      await onUploaded?.(response);
      setArchivo(null);
    } catch (err) {
      setError(err.data?.mensaje || err.data?.message || err.message || 'No fue posible subir la imagen.');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <section className="admin-upload-widget">
      <div
        className={`admin-upload-dropzone ${arrastrando ? 'is-dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={manejarDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={(event) => {
            seleccionarArchivo(event.target.files?.[0]);
            event.target.value = '';
          }}
          hidden
        />
        <strong>Arrastra una imagen aqui o haz clic para seleccionarla</strong>
        <p>JPG, PNG o WEBP. Tamano maximo 10MB.</p>
        <div className="admin-upload-actions">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled || subiendo}>
            Seleccionar archivo
          </button>
          <button type="button" onClick={subir} disabled={disabled || subiendo}>
            {subiendo ? 'Subiendo...' : 'Subir imagen'}
          </button>
        </div>
      </div>

      <div className="admin-upload-preview">
        {previewUrl ? <img src={previewUrl} alt="Preview de imagen" /> : <span>Preview</span>}
      </div>

      {mensaje ? <p className="admin-upload-message is-ok">{mensaje}</p> : null}
      {error ? <p className="admin-upload-message is-error">{error}</p> : null}
    </section>
  );
}
