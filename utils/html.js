'use strict';

const sanitizeHtml = require('sanitize-html');

const sanitizeOpts = {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
    'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'pre', 'code', 'span', 'div',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    span: ['class'],
    p: ['class'],
    div: ['class'],
    pre: ['class'],
    code: ['class'],
    li: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  transformTags: {
    a: (tagName, attribs) => {
      const out = { ...attribs };
      if (out.target === '_blank') {
        out.rel = 'noopener noreferrer';
      }
      return { tagName, attribs: out };
    },
  },
};

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeBlogHtml(html) {
  return sanitizeHtml(html || '', sanitizeOpts);
}

/** True if content looks like HTML from the rich editor (vs legacy plain text). */
function looksLikeRichHtml(content) {
  return /<\/?(p|ul|ol|h[1-6]|blockquote|div|pre|strong|em|li|span|a)\b/i.test(String(content || ''));
}

/** Safe HTML for public blog post body (legacy plain text → br, rich → sanitized HTML). */
function renderBlogContent(raw) {
  const s = String(raw || '');
  if (!s.trim()) return '';
  if (looksLikeRichHtml(s)) return sanitizeBlogHtml(s);
  return sanitizeHtml(s.replace(/\n/g, '<br>'), { allowedTags: ['br'], allowedAttributes: {} });
}

module.exports = {
  stripHtml,
  sanitizeBlogHtml,
  renderBlogContent,
};
