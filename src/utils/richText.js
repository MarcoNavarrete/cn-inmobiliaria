import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'b',
  'blockquote',
  'br',
  'em',
  'h2',
  'h3',
  'i',
  'li',
  'ol',
  'p',
  'strong',
  'u',
  'ul',
];

const ALLOWED_ATTR = ['style'];
const ALLOWED_ALIGN_VALUES = new Set(['left', 'center', 'right', 'justify']);

const hasWindow = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const looksLikeHtml = (value) => /<\/?[a-z][\s\S]*>/i.test(String(value || ''));

export const plainTextToHtml = (value) => {
  const text = String(value || '').replace(/\r\n/g, '\n').trim();

  if (!text) {
    return '';
  }

  return text
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block
        .split('\n')
        .map((line) => escapeHtml(line))
        .join('<br />');

      return `<p>${lines}</p>`;
    })
    .join('');
};

const sanitizeStyle = (value) => {
  if (!value) {
    return '';
  }

  return String(value)
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.split(':').map((part) => part.trim()))
    .filter(([prop, styleValue]) => {
      if (String(prop || '').toLowerCase() !== 'text-align') {
        return false;
      }

      return ALLOWED_ALIGN_VALUES.has(String(styleValue || '').toLowerCase());
    })
    .map(([prop, styleValue]) => `${String(prop).toLowerCase()}: ${String(styleValue).toLowerCase()}`)
    .join('; ');
};

export const isRichTextHtmlEmpty = (value) => {
  const normalized = String(value || '')
    .replace(/<p><br><\/p>/gi, '')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized === '';
};

const createPurifier = () => {
  if (!hasWindow()) {
    return null;
  }

  const purifier = DOMPurify(window);

  purifier.setConfig({
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ['h1', 'h4', 'h5', 'h6', 'script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
  });

  return purifier;
};

export const sanitizeRichTextHtml = (value) => {
  const input = String(value || '').trim();

  if (!input) {
    return '';
  }

  if (!hasWindow()) {
    return '';
  }

  const purifier = createPurifier();
  if (!purifier) {
    return '';
  }

  purifier.addHook('uponSanitizeAttribute', (node, data) => {
    const attrName = String(data.attrName || '').toLowerCase();

    if (attrName.startsWith('on')) {
      data.keepAttr = false;
      return;
    }

    if (attrName === 'style') {
      const safeStyle = sanitizeStyle(data.attrValue);
      if (safeStyle) {
        data.attrValue = safeStyle;
        data.keepAttr = true;
      } else {
        data.keepAttr = false;
      }
      return;
    }

  });

  const sanitized = purifier.sanitize(input, {
    RETURN_TRUSTED_TYPE: false,
  });

  purifier.removeAllHooks();

  const output = String(sanitized || '').trim();

  return isRichTextHtmlEmpty(output) ? '' : output;
};

export const prepareRichTextForEditor = (value) => {
  const input = String(value || '').trim();

  if (!input) {
    return '';
  }

  return looksLikeHtml(input) ? sanitizeRichTextHtml(input) : plainTextToHtml(input);
};

export const normalizeRichTextValue = (value) => {
  const input = String(value || '').trim();

  if (!input) {
    return '';
  }

  if (!looksLikeHtml(input)) {
    return plainTextToHtml(input);
  }

  const sanitized = sanitizeRichTextHtml(input);

  return sanitized || '';
};

export const renderRichTextPreview = (value) => {
  const input = String(value || '').trim();

  if (!input) {
    return '';
  }

  return looksLikeHtml(input) ? sanitizeRichTextHtml(input) : '';
};
