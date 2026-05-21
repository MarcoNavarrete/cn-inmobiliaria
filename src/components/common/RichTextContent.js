import React, { useMemo } from 'react';
import { isRichTextHtmlEmpty, looksLikeHtml, sanitizeRichTextHtml } from '../../utils/richText';
import './RichTextContent.css';

export default function RichTextContent({ className = '', value = '' }) {
  const rawValue = String(value || '').trim();
  const isHtml = looksLikeHtml(rawValue);
  const htmlValue = useMemo(() => {
    if (!isHtml) {
      return '';
    }

    return sanitizeRichTextHtml(rawValue);
  }, [isHtml, rawValue]);

  if (htmlValue && !isRichTextHtmlEmpty(htmlValue)) {
    return (
      <div
        className={`rich-text-content is-html ${className}`.trim()}
        dangerouslySetInnerHTML={{ __html: htmlValue }}
      />
    );
  }

  if (isHtml) {
    return (
      <div className={`rich-text-content is-plain ${className}`.trim()}>
        Sin descripcion disponible.
      </div>
    );
  }

  return (
    <div className={`rich-text-content is-plain ${className}`.trim()}>
      {rawValue || 'Sin descripcion disponible.'}
    </div>
  );
}
