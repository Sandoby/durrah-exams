#!/usr/bin/env node
// generate-sitemap.cjs
// Run after vite build to produce a fresh sitemap.xml inside dist/
// Usage: node scripts/generate-sitemap.cjs

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Configuration ─────────────────────────────────────────────────────────
const SITE_URL     = 'https://durrahtutors.com';
const OUTPUT_PATH  = path.join(__dirname, '..', 'dist', 'sitemap.xml');
const TODAY        = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

// ─── Static public routes ───────────────────────────────────────────────────
// login / register / dashboard / admin are excluded intentionally (private / auth)
const staticRoutes = [
  { path: '/',                 changefreq: 'weekly',  priority: '1.0', lastmod: TODAY },
  { path: '/ar',               changefreq: 'weekly',  priority: '0.9', lastmod: TODAY },
  { path: '/pricing',          changefreq: 'monthly', priority: '0.9', lastmod: TODAY },
  { path: '/ar/pricing',       changefreq: 'monthly', priority: '0.8', lastmod: TODAY },
  { path: '/kids',             changefreq: 'monthly', priority: '0.8', lastmod: TODAY },
  { path: '/blog',             changefreq: 'weekly',  priority: '0.8', lastmod: TODAY },
  { path: '/demo',             changefreq: 'monthly', priority: '0.7', lastmod: TODAY },
  { path: '/privacy',          changefreq: 'yearly',  priority: '0.3', lastmod: TODAY },
  { path: '/terms',            changefreq: 'yearly',  priority: '0.3', lastmod: TODAY },
  { path: '/refund-policy',    changefreq: 'yearly',  priority: '0.3', lastmod: TODAY },
  { path: '/about',            changefreq: 'monthly', priority: '0.7', lastmod: TODAY },
  { path: '/ar/about',         changefreq: 'monthly', priority: '0.6', lastmod: TODAY },
  { path: '/contact',          changefreq: 'monthly', priority: '0.7', lastmod: TODAY },
  { path: '/ar/contact',       changefreq: 'monthly', priority: '0.6', lastmod: TODAY },
];

// ─── Parse blog posts from blogData.ts using regex ─────────────────────────
function extractBlogPosts() {
  const blogDataPath = path.join(
    __dirname, '..', 'src', 'pages', 'blog', 'blogData.ts'
  );

  if (!fs.existsSync(blogDataPath)) {
    console.warn('[sitemap] WARNING: blogData.ts not found at', blogDataPath);
    return [];
  }

  const source = fs.readFileSync(blogDataPath, 'utf-8');
  const posts  = [];

  // Match each blog post object block between two consecutive `{` entries in blogPosts array
  // Strategy: extract slug + date using targeted regex on the full file
  const slugRegex  = /slug:\s*['"]([^'"]+)['"]/g;
  const dateRegex  = /date:\s*['"](\d{4}-\d{2}-\d{2})['"]/g;

  const slugs = [];
  const dates = [];

  let m;
  while ((m = slugRegex.exec(source)) !== null)  slugs.push(m[1]);
  while ((m = dateRegex.exec(source)) !== null)  dates.push(m[1]);

  // Pair slugs with dates positionally (they appear in the same order in each object)
  const count = Math.min(slugs.length, dates.length);
  for (let i = 0; i < count; i++) {
    posts.push({ slug: slugs[i], date: dates[i] });
  }

  console.log(`[sitemap] Found ${posts.length} blog posts`);
  return posts;
}

// ─── Build XML ──────────────────────────────────────────────────────────────
function buildSitemap(staticUrls, blogPosts) {
  const urlEntries = [];

  // Add static routes
  for (const route of staticUrls) {
    urlEntries.push(
      `  <url>\n` +
      `    <loc>${SITE_URL}${route.path}</loc>\n` +
      `    <lastmod>${route.lastmod}</lastmod>\n` +
      `    <changefreq>${route.changefreq}</changefreq>\n` +
      `    <priority>${route.priority}</priority>\n` +
      `  </url>`
    );
  }

  // Add blog posts
  for (const post of blogPosts) {
    urlEntries.push(
      `  <url>\n` +
      `    <loc>${SITE_URL}/blog/${post.slug}</loc>\n` +
      `    <lastmod>${post.date}</lastmod>\n` +
      `    <changefreq>monthly</changefreq>\n` +
      `    <priority>0.7</priority>\n` +
      `  </url>`
    );
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urlEntries.join('\n') + '\n' +
    `</urlset>\n`
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────
(function main() {
  const blogPosts = extractBlogPosts();
  const xml       = buildSitemap(staticRoutes, blogPosts);

  // Ensure dist/ exists (it should after vite build, but guard anyway)
  const distDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, xml, 'utf-8');

  const totalUrls = staticRoutes.length + blogPosts.length;
  console.log(`[sitemap] ✅ Generated ${totalUrls} URLs → ${OUTPUT_PATH}`);

  // Also update public/sitemap.xml so it stays in sync during dev
  const publicSitemapPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
  fs.writeFileSync(publicSitemapPath, xml, 'utf-8');
  console.log(`[sitemap] ✅ Also updated ${publicSitemapPath}`);
})();
