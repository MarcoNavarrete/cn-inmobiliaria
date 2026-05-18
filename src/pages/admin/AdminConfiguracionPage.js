import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuthSession from '../../hooks/useAuthSession';
import { getConfiguracion, updateConfiguracion } from '../../services/adminConfiguracionService';
import './AdminConfiguracionPage.css';

const FORM_INICIAL = {
  nombreComercial: '',
  whatsappPrincipal: '',
  correoContacto: '',
  ga4MeasurementId: '',
  metaPixelId: '',
  tikTokPixelId: '',
  limitePublicacionesGratis: '',
  activarTours360: false,
  activarPlanoInteractivo: false,
  activarDesarrollosPremium: false,
  activarLoteos: false,
  mostrarLogoEmpresa: true,
};

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible guardar la configuracion.';

const sanitizeWhatsApp = (value) => String(value || '').replace(/\s+/g, '').trim();

const sanitizeText = (value) => String(value || '').trim();

const validateForm = (form) => {
  const limite = String(form.limitePublicacionesGratis ?? '').trim();

  if (limite !== '') {
    const parsed = Number(limite);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return 'El limite de publicaciones gratis debe ser un entero mayor o igual a 0.';
    }
  }

  const ga4 = sanitizeText(form.ga4MeasurementId);
  if (ga4 && !ga4.startsWith('G-')) {
    return 'El GA4 Measurement ID debe iniciar con G-.';
  }

  const correo = sanitizeText(form.correoContacto);
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return 'El correo de contacto tiene un formato invalido.';
  }

  return '';
};

const mapConfiguracionToForm = (data = {}) => ({
  nombreComercial: data.nombreComercial || '',
  whatsappPrincipal: data.whatsappPrincipal || '',
  correoContacto: data.correoContacto || '',
  ga4MeasurementId: data.ga4MeasurementId || '',
  metaPixelId: data.metaPixelId || '',
  tikTokPixelId: data.tikTokPixelId || '',
  limitePublicacionesGratis: data.limitePublicacionesGratis ?? '',
  activarTours360: Boolean(data.activarTours360),
  activarPlanoInteractivo: Boolean(data.activarPlanoInteractivo),
  activarDesarrollosPremium: Boolean(data.activarDesarrollosPremium),
  activarLoteos: Boolean(data.activarLoteos),
  mostrarLogoEmpresa: data.mostrarLogoEmpresa !== false,
});

const buildPayload = (form) => ({
  nombreComercial: sanitizeText(form.nombreComercial),
  whatsappPrincipal: sanitizeWhatsApp(form.whatsappPrincipal),
  correoContacto: sanitizeText(form.correoContacto),
  ga4MeasurementId: sanitizeText(form.ga4MeasurementId),
  metaPixelId: sanitizeText(form.metaPixelId),
  tikTokPixelId: sanitizeText(form.tikTokPixelId),
  limitePublicacionesGratis: form.limitePublicacionesGratis === '' ? null : Number(form.limitePublicacionesGratis),
  activarTours360: Boolean(form.activarTours360),
  activarPlanoInteractivo: Boolean(form.activarPlanoInteractivo),
  activarDesarrollosPremium: Boolean(form.activarDesarrollosPremium),
  activarLoteos: Boolean(form.activarLoteos),
  mostrarLogoEmpresa: Boolean(form.mostrarLogoEmpresa),
});

export default function AdminConfiguracionPage() {
  const { cargando, esAdminCn } = useAuthSession();
  const [form, setForm] = useState(FORM_INICIAL);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarConfiguracion = useCallback(async (options = {}) => {
    setLoadingConfig(true);
    setError('');

    try {
      const data = await getConfiguracion(options);
      setForm((actual) => ({
        ...actual,
        ...mapConfiguracionToForm(data),
      }));
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(getApiErrorMessage(err));
      }
    } finally {
      if (!options.signal?.aborted) {
        setLoadingConfig(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    if (!cargando && esAdminCn) {
      cargarConfiguracion({ signal: controller.signal });
    }

    return () => controller.abort();
  }, [cargando, cargarConfiguracion, esAdminCn]);

  const actualizarCampo = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((actual) => ({
      ...actual,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const guardarConfiguracion = async (event) => {
    event.preventDefault();

    const validacion = validateForm(form);
    if (validacion) {
      setError(validacion);
      return;
    }

    setSaving(true);
    setError('');
    setMensaje('');

    try {
      await updateConfiguracion(buildPayload(form));
      setMensaje('Configuracion guardada correctamente.');
      await cargarConfiguracion();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (cargando) {
    return (
      <main className="admin-configuracion">
        <p className="admin-configuracion-feedback">Cargando acceso al panel...</p>
      </main>
    );
  }

  if (!esAdminCn) {
    return (
      <main className="admin-configuracion">
        <section className="admin-configuracion-empty">
          <h1>No tienes permiso para acceder a esta seccion.</h1>
          <Link to="/admin/proyectos-inmobiliarios">Ir a proyectos inmobiliarios</Link>
        </section>
      </main>
    );
  }

  if (loadingConfig) {
    return (
      <main className="admin-configuracion">
        <p className="admin-configuracion-feedback">Cargando configuracion...</p>
      </main>
    );
  }

  return (
    <main className="admin-configuracion">
      <section className="admin-configuracion-hero">
        <div>
          <p className="admin-configuracion-eyebrow">Configuracion</p>
          <h1>Configuracion general</h1>
          <p>Lee y guarda la configuracion real del panel desde el API administrativo.</p>
        </div>
        <Link to="/admin/dashboard">Volver al dashboard</Link>
      </section>

      <section className="admin-configuracion-feedback">
        <p>Configuracion conectada con API real.</p>
      </section>

      {mensaje ? <p className="admin-configuracion-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="admin-configuracion-feedback is-error">{error}</p> : null}

      <form className="admin-configuracion-grid" onSubmit={guardarConfiguracion}>
        <article className="admin-configuracion-card">
          <div className="admin-configuracion-card-head">
            <h2>Empresa / marca</h2>
            <span>Editable</span>
          </div>
          <div className="admin-configuracion-fields">
            <label>
              <span>Nombre comercial</span>
              <input name="nombreComercial" value={form.nombreComercial} onChange={actualizarCampo} />
            </label>
            <label>
              <span>WhatsApp principal</span>
              <input name="whatsappPrincipal" value={form.whatsappPrincipal} onChange={actualizarCampo} />
            </label>
            <label>
              <span>Correo de contacto</span>
              <input type="email" name="correoContacto" value={form.correoContacto} onChange={actualizarCampo} />
            </label>
          </div>
        </article>

        <article className="admin-configuracion-card">
          <div className="admin-configuracion-card-head">
            <h2>Analitica y tracking</h2>
            <span>Editable</span>
          </div>
          <div className="admin-configuracion-fields">
            <label>
              <span>GA4 Measurement ID</span>
              <input name="ga4MeasurementId" value={form.ga4MeasurementId} onChange={actualizarCampo} placeholder="G-XXXXXXXXXX" />
            </label>
            <label>
              <span>Meta Pixel ID</span>
              <input name="metaPixelId" value={form.metaPixelId} onChange={actualizarCampo} />
            </label>
            <label>
              <span>TikTok Pixel ID</span>
              <input name="tikTokPixelId" value={form.tikTokPixelId} onChange={actualizarCampo} />
            </label>
          </div>
        </article>

        <article className="admin-configuracion-card">
          <div className="admin-configuracion-card-head">
            <h2>Reglas comerciales</h2>
            <span>Editable</span>
          </div>
          <div className="admin-configuracion-fields">
            <label>
              <span>Limite de publicaciones gratuitas</span>
              <input type="number" min="0" step="1" name="limitePublicacionesGratis" value={form.limitePublicacionesGratis} onChange={actualizarCampo} />
            </label>
            <label className="admin-configuracion-checkbox">
              <input type="checkbox" name="mostrarLogoEmpresa" checked={form.mostrarLogoEmpresa} onChange={actualizarCampo} />
              <span>Mostrar logo de la empresa</span>
            </label>
          </div>
        </article>

        <article className="admin-configuracion-card">
          <div className="admin-configuracion-card-head">
            <h2>Modulos activos</h2>
            <span>Editable</span>
          </div>
          <div className="admin-configuracion-fields">
            <label className="admin-configuracion-checkbox">
              <input type="checkbox" name="activarTours360" checked={form.activarTours360} onChange={actualizarCampo} />
              <span>Activar tours 360</span>
            </label>
            <label className="admin-configuracion-checkbox">
              <input type="checkbox" name="activarPlanoInteractivo" checked={form.activarPlanoInteractivo} onChange={actualizarCampo} />
              <span>Activar plano interactivo</span>
            </label>
            <label className="admin-configuracion-checkbox">
              <input type="checkbox" name="activarDesarrollosPremium" checked={form.activarDesarrollosPremium} onChange={actualizarCampo} />
              <span>Activar desarrollos premium</span>
            </label>
            <label className="admin-configuracion-checkbox">
              <input type="checkbox" name="activarLoteos" checked={form.activarLoteos} onChange={actualizarCampo} />
              <span>Activar loteos</span>
            </label>
          </div>
        </article>

        <article className="admin-configuracion-card">
          <div className="admin-configuracion-card-head">
            <h2>Usuarios y roles</h2>
            <span>Referencia</span>
          </div>
          <p>La administracion de roles se mantiene en los modulos existentes. Esta pantalla solo expone la configuracion transversal del sitio.</p>
        </article>

        <div className="admin-configuracion-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar configuracion'}
          </button>
        </div>
      </form>
    </main>
  );
}
