#!/usr/bin/env node
// scripts/prerender.cjs
// Run after vite build to prerender public pages using Puppeteer

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer');

const PORT = 5174;
const SITE_URL = `http://localhost:${PORT}`;
const DIST_DIR = path.join(__dirname, '..', 'dist');
const TEMP_INDEX_PATH = path.join(DIST_DIR, 'index.temp.html');
const ORIGINAL_INDEX_PATH = path.join(DIST_DIR, 'index.html');

// ─── Configuration ─────────────────────────────────────────────────────────
const staticRoutes = [
  '/',
  '/ar',
  '/pricing',
  '/ar/pricing',
  '/kids',
  '/blog',
  '/demo',
  '/privacy',
  '/terms',
  '/refund-policy',
  '/about',
  '/ar/about',
  '/contact',
  '/ar/contact'
];

// ─── Mime Types Helper ─────────────────────────────────────────────────────
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// ─── Parse blog posts from blogData.ts ─────────────────────────────────────
function extractBlogPosts() {
  const blogDataPath = path.join(
    __dirname, '..', 'src', 'pages', 'blog', 'blogData.ts'
  );

  if (!fs.existsSync(blogDataPath)) {
    console.warn('[prerender] WARNING: blogData.ts not found at', blogDataPath);
    return [];
  }

  const source = fs.readFileSync(blogDataPath, 'utf-8');
  const slugRegex = /slug:\s*['"]([^'"]+)['"]/g;
  const slugs = [];

  let m;
  while ((m = slugRegex.exec(source)) !== null) {
    slugs.push(m[1]);
  }

  return slugs.map(slug => `/blog/${slug}`);
}

// ─── Start static file server serving SPA fallback ─────────────────────────
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      // Decode URI to handle potential special chars in file names
      const decodedUrl = decodeURIComponent(req.url.split('?')[0]);
      let filePath = path.join(DIST_DIR, decodedUrl);

      // If file doesn't exist or is a directory, serve the clean SPA template
      const ext = path.extname(filePath);
      if (!ext || !fs.existsSync(filePath)) {
        filePath = TEMP_INDEX_PATH;
      }

      const contentType = mimeTypes[path.extname(filePath)] || 'application/octet-stream';

      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content, 'utf-8');
        }
      });
    });

    server.listen(PORT, () => {
      console.log(`[prerender] Local server running at http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

// ─── Main Execution ────────────────────────────────────────────────────────
(async () => {
  console.log('[prerender] Starting prerendering process...');

  if (!fs.existsSync(ORIGINAL_INDEX_PATH)) {
    console.error(`[prerender] ERROR: index.html not found in ${DIST_DIR}. Build first.`);
    process.exit(1);
  }

  // 1. Create a backup index file that serves as our clean SPA shell during rendering
  fs.copyFileSync(ORIGINAL_INDEX_PATH, TEMP_INDEX_PATH);
  console.log('[prerender] Created temporary clean SPA template file.');

  // 2. Resolve all public routes
  const blogRoutes = extractBlogPosts();
  const allRoutes = [...staticRoutes, ...blogRoutes];
  console.log(`[prerender] Found ${allRoutes.length} total routes to prerender (${staticRoutes.length} static + ${blogRoutes.length} blog posts).`);

  // 3. Start local server
  const server = await startServer();

  // 4. Launch Puppeteer
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Configure viewport size
  await page.setViewport({ width: 1280, height: 800 });

  // 5. Prerender each route
  for (const route of allRoutes) {
    const url = `${SITE_URL}${route}`;
    console.log(`[prerender] Crawling ${route}...`);

    try {
      // Navigate to route
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      // Small extra pause for React execution/state stability
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));

      // Extract HTML content
      const html = await page.content();

      // Write output to dist/<route>/index.html (or dist/index.html for root)
      if (route === '/') {
        fs.writeFileSync(ORIGINAL_INDEX_PATH, html, 'utf-8');
        console.log(`[prerender] Saved root route directly to dist/index.html`);
      } else {
        const outputDir = path.join(DIST_DIR, route);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        fs.writeFileSync(path.join(outputDir, 'index.html'), html, 'utf-8');
        console.log(`[prerender] Saved ${route} to dist${route}/index.html`);
      }
    } catch (err) {
      console.error(`[prerender] Failed to prerender route ${route}:`, err);
    }
  }

  // 6. Cleanup
  console.log('[prerender] Cleaning up resources...');
  await browser.close();
  server.close();

  if (fs.existsSync(TEMP_INDEX_PATH)) {
    fs.unlinkSync(TEMP_INDEX_PATH);
  }

  console.log('[prerender] ✅ Prerendering completed successfully!');
})();
