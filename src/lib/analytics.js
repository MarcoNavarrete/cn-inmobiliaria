const GA_MEASUREMENT_ID = 'G-YBT76N92WM';
const LOCALHOST_ALLOW_FLAGS = ['REACT_APP_ENABLE_GA_LOCALHOST', 'REACT_APP_ENABLE_GA'];

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const readEnvFlag = (name) => String(process.env[name] || '').trim().toLowerCase() === 'true';

const isLocalhost = () => {
  if (!isBrowser()) {
    return false;
  }

  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
};

const isAnalyticsAllowed = () => {
  if (!isBrowser()) {
    return false;
  }

  if (process.env.NODE_ENV === 'production') {
    return true;
  }

  if (!isLocalhost()) {
    return true;
  }

  return LOCALHOST_ALLOW_FLAGS.some((flag) => readEnvFlag(flag));
};

const ensureDataLayer = () => {
  if (!isBrowser()) {
    return false;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  return true;
};

let initialized = false;
let scriptRequested = false;

export const initGA = () => {
  if (!isAnalyticsAllowed()) {
    return false;
  }

  if (!ensureDataLayer()) {
    return false;
  }

  if (initialized) {
    return true;
  }

  if (!scriptRequested) {
    scriptRequested = true;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.referrerPolicy = 'strict-origin-when-cross-origin';
    document.head.appendChild(script);
  }

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false,
  });

  initialized = true;
  return true;
};

export const trackEvent = (eventName, params = {}) => {
  if (!isAnalyticsAllowed() || !ensureDataLayer()) {
    return;
  }

  window.gtag('event', eventName, params);
};

export const trackPageView = (pagePath, title) => {
  if (!isAnalyticsAllowed() || !ensureDataLayer()) {
    return;
  }

  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_title: title || document.title || 'CN Inmobiliaria',
    page_location: window.location.href,
  });
};
