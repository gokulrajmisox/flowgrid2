const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://flowgridco.in';
const SOCIAL_IMAGE = `${SITE}/assets/meta/social_sharing.jpg`;
const DEFAULT_DESCRIPTION = 'Flowgrid helps businesses streamline operations with business management systems, AI voice automation, client communication solutions, and custom web software.';

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function jsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function cleanText(value) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function pageInfo(file) {
  const relative = path.relative(ROOT, file).replaceAll(path.sep, '/');
  if (relative === 'index.html') {
    return {
      url: '/',
      title: 'Flowgrid | Business Systems, AI Voice Automation & Web Solutions',
      description: DEFAULT_DESCRIPTION,
      type: 'WebPage',
    };
  }
  if (relative === 'about.html') {
    return {
      url: '/about',
      title: 'Flowgrid | About Our Business Systems & AI Voice Studio',
      description: 'Learn how Flowgrid combines design, software, connected operations, client communication, and AI voice workflows for growing businesses.',
      type: 'AboutPage',
    };
  }
  if (relative === 'projects.html') {
    return {
      url: '/projects',
      title: 'Flowgrid | Business Systems, AI Voice Automation & Web Solutions',
      description: 'Explore Flowgrid capabilities and project work across connected operations, AI voice automation, client communication, and custom web software.',
      type: 'CollectionPage',
    };
  }
  if (relative === 'careers.html') {
    return {
      url: '/careers',
      title: 'Flowgrid | Careers & Internship Program',
      description: 'Build what comes next at Flowgrid. Explore open internship opportunities across web development, UI/UX design, AI/ML, digital marketing, and content creation.',
      type: 'WebPage',
    };
  }
  if (relative.startsWith('projects/')) {
    const source = fs.readFileSync(file, 'utf8');
    const titleMatch = source.match(/<title>([\s\S]*?)<\/title>/i);
    const descMatch = source.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
    const slug = path.basename(relative, '.html');
    const projectTitle = cleanText(titleMatch ? titleMatch[1] : slug.replaceAll('_', ' ')).replace(/^Flowgrid\s*[-|—]\s*/i, '');
    const existingDescription = cleanText(descMatch ? descMatch[1] : '');
    return {
      url: `/projects/${slug}`,
      title: `Flowgrid | ${projectTitle}`,
      description: existingDescription || `A Flowgrid project case study featuring ${projectTitle}.`,
      type: 'WebPage',
      projectTitle,
    };
  }
  return null;
}

function replaceOrRemove(html, pattern, replacement) {
  return html.replace(pattern, replacement);
}

function seoHead(info, html) {
  const canonical = `${SITE}${info.url === '/' ? '/' : info.url}`;
  const relativeDepth = info.url.startsWith('/projects/') ? '../' : '';
  const organization = {
    '@type': 'Organization',
    '@id': `${SITE}/#organization`,
    name: 'Flowgrid',
    url: `${SITE}/`,
    email: 'balaoldmaster@gmail.com',
    telephone: '+919489368104',
  };
  const graph = [organization, {
    '@type': 'WebSite',
    '@id': `${SITE}/#website`,
    name: 'Flowgrid',
    url: `${SITE}/`,
    publisher: { '@id': `${SITE}/#organization` },
  }, {
    '@type': info.type,
    '@id': `${canonical}#webpage`,
    name: info.title,
    url: canonical,
    description: info.description,
    isPartOf: { '@id': `${SITE}/#website` },
    about: { '@id': `${SITE}/#organization` },
  }];
  const additions = [
    `<title>${escapeHtml(info.title)}</title>`,
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<meta name="description" content="${escapeHtml(info.description)}">`,
    `<link rel="canonical" href="${canonical}">`,
    `<meta property="og:title" content="${escapeHtml(info.title)}">`,
    `<meta property="og:description" content="${escapeHtml(info.description)}">`,
    `<meta property="og:url" content="${canonical}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Flowgrid">',
    '<meta property="og:locale" content="en_IN">',
    `<meta property="og:image" content="${SOCIAL_IMAGE}">`,
    `<meta property="og:image:alt" content="${escapeHtml(info.title)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeHtml(info.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(info.description)}">`,
    `<meta name="twitter:image" content="${SOCIAL_IMAGE}">`,
    `<link rel="sitemap" href="${relativeDepth}sitemap.xml">`,
    `<script type="application/ld+json" id="flowgrid-structured-data">${jsonLd({ '@context': 'https://schema.org', '@graph': graph })}</script>`,
  ].join('');

  let head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1];
  if (!head) throw new Error(`No head found in ${info.url}`);
  head = head
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\s+charset=[^>]*>/gi, '')
    .replace(/<meta\s+name=["']viewport["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:[^>]*>/gi, '')
    .replace(/<meta\s+name=["']twitter:[^>]*>/gi, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<link\s+rel=["']sitemap["'][^>]*>/gi, '')
    .replace(/<script\s+type=["']application\/ld\+json["'][^>]*id=["']flowgrid-structured-data["'][^>]*>[\s\S]*?<\/script>/gi, '');
  return html.replace(/<head>[\s\S]*?<\/head>/i, `<head>${additions}${head}</head>`);
}

function writeSitemap(pages) {
  const urls = pages.map((page) => `  <url><loc>${SITE}${page.url}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
}

function main() {
  const files = [path.join(ROOT, 'index.html'), path.join(ROOT, 'about.html'), path.join(ROOT, 'projects.html'), path.join(ROOT, 'careers.html'), ...fs.readdirSync(path.join(ROOT, 'projects')).filter((name) => name.endsWith('.html')).sort().map((name) => path.join(ROOT, 'projects', name))];
  const pages = [];
  for (const file of files) {
    const info = pageInfo(file);
    if (!info) continue;
    const original = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, seoHead(info, original));
    pages.push(info);
  }
  writeSitemap(pages);
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  console.log(`Generated SEO metadata for ${pages.length} pages and sitemap.xml`);
}

main();
