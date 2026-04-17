'use strict';

/**
 * @param {string} baseUrl Site origin, e.g. https://www.example.com
 * @param {string} [pathOrUrl] Absolute http(s) URL or site path starting with /
 */
function toAbsoluteUrl(baseUrl, pathOrUrl) {
  if (pathOrUrl == null || pathOrUrl === '') return null;
  const s = String(pathOrUrl).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const origin = normalizeOrigin(baseUrl);
  const path = s.startsWith('/') ? s : `/${s}`;
  return origin + path;
}

function normalizeOrigin(baseUrl) {
  const u = new URL(baseUrl);
  u.pathname = '';
  u.search = '';
  u.hash = '';
  let href = u.href;
  if (href.endsWith('/')) href = href.slice(0, -1);
  return href;
}

function canonicalUrl(baseUrl, pathname) {
  const origin = normalizeOrigin(baseUrl);
  const path = pathname && pathname !== '' ? pathname : '/';
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return origin + normalized.split('?')[0].split('#')[0];
}

/** Public marketing paths for sitemap (no query strings). */
const MARKETING_PATHS = [
  '/',
  '/students',
  '/students/apply',
  '/partners',
  '/how-it-works',
  '/faq',
  '/blog',
  '/contact',
  '/about',
  '/career-passport',
  '/policy',
];

function founderId(url, name, index) {
  const slug = String(name || 'founder')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  return `${url}/#founder-${slug || 'person'}-${index}`;
}

function homeJsonLd(seo) {
  const url = normalizeOrigin(seo.baseUrl);
  const logo = toAbsoluteUrl(seo.baseUrl, seo.defaultOgImagePath || '/images/logo.png');
  const rawFounders = Array.isArray(seo.founders) ? seo.founders : [];
  const orgId = `${url}/#organization`;
  const founderNodes = rawFounders
    .filter((f) => f && f.name)
    .map((f, index) => ({
      '@type': 'Person',
      '@id': founderId(url, f.name, index),
      name: f.name,
      jobTitle: f.jobTitle || 'Founder',
      worksFor: { '@id': orgId },
    }));

  const org = {
    '@type': 'Organization',
    '@id': orgId,
    name: seo.siteName,
    url,
    logo: { '@type': 'ImageObject', url: logo },
    description: seo.defaultDescription,
  };
  const same = Array.isArray(seo.sameAs) ? seo.sameAs.filter(Boolean) : [];
  if (same.length) org.sameAs = same;
  if (founderNodes.length) {
    org.founder = founderNodes.map((node) => ({ '@id': node['@id'] }));
  }

  const website = {
    '@type': 'WebSite',
    '@id': `${url}/#website`,
    url,
    name: seo.siteName,
    description: seo.searchDescription || seo.defaultDescription,
    publisher: { '@id': orgId },
    inLanguage: 'en-NG',
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [org, ...founderNodes, website],
  };
}

function blogPostingJsonLd(seo, post, canonicalHref) {
  const orgId = `${normalizeOrigin(seo.baseUrl)}/#organization`;
  const img = post.image ? toAbsoluteUrl(seo.baseUrl, post.image) : null;
  const plain =
    post.excerpt ||
    (post.content || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300);
  const doc = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: plain,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalHref },
    url: canonicalHref,
    datePublished: post.createdAt ? new Date(post.createdAt).toISOString() : undefined,
    dateModified: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
    author: { '@type': 'Organization', name: seo.siteName, '@id': orgId },
    publisher: { '@type': 'Organization', name: seo.siteName, '@id': orgId },
    inLanguage: 'en-NG',
  };
  if (img) doc.image = [img];
  return doc;
}

function serializeJsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

module.exports = {
  toAbsoluteUrl,
  normalizeOrigin,
  canonicalUrl,
  MARKETING_PATHS,
  homeJsonLd,
  blogPostingJsonLd,
  serializeJsonLd,
};
