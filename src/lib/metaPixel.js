const META_PIXEL_ID = '229699893265813';
const LOCALHOST_ALLOW_FLAG = 'REACT_APP_ENABLE_PIXEL_LOCAL';

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const readEnvFlag = (name) => String(process.env[name] || '').trim().toLowerCase() === 'true';

const isPrivateLocalHost = () => {
  if (!isBrowser()) {
    return false;
  }

  const hostname = String(window.location.hostname || '').trim();

  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)
  );
};

const isPixelAllowed = () => {
  if (!isBrowser()) {
    return false;
  }

  if (isPrivateLocalHost()) {
    return readEnvFlag(LOCALHOST_ALLOW_FLAG);
  }

  return true;
};

const ensureFbq = () => {
  if (!isBrowser()) {
    return false;
  }

  if (window.fbq) {
    return true;
  }

  const fbq = function fbq() {
    fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
  };

  fbq.push = fbq;
  fbq.loaded = false;
  fbq.version = '2.0';
  fbq.queue = [];

  window.fbq = fbq;
  window._fbq = fbq;
  return true;
};

let initialized = false;
let scriptRequested = false;

export const initMetaPixel = () => {
  if (!isPixelAllowed()) {
    return false;
  }

  if (!ensureFbq()) {
    return false;
  }

  if (initialized) {
    return true;
  }

  if (!scriptRequested) {
    scriptRequested = true;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    script.referrerPolicy = 'strict-origin-when-cross-origin';
    document.head.appendChild(script);
  }

  window.fbq('init', META_PIXEL_ID);

  initialized = true;
  return true;
};

export const trackMetaPageView = (pagePath, title) => {
  if (!isPixelAllowed() || !ensureFbq()) {
    return;
  }

  window.fbq('track', 'PageView', {
    content_name: title || document.title || 'CN Inmobiliaria',
    page_path: pagePath || window.location.href,
    page_location: window.location.href,
  });
};

export const trackMetaEvent = (eventName, params = {}) => {
  if (!isPixelAllowed() || !ensureFbq()) {
    return;
  }

  window.fbq('track', eventName, params);
};

export const trackMetaCustomEvent = (eventName, params = {}) => {
  if (!isPixelAllowed() || !ensureFbq()) {
    return;
  }

  window.fbq('trackCustom', eventName, params);
};
