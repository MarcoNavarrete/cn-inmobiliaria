import React from 'react';
import ReactMarkdown from 'react-markdown';
import './MarkdownContent.css';

export default function MarkdownContent({ content, fallback = '' }) {
  const markdown = String(content || fallback || '').trim();

  if (!markdown) {
    return null;
  }

  return (
    <div className="markdown-content">
      <ReactMarkdown skipHtml>{markdown}</ReactMarkdown>
    </div>
  );
}
