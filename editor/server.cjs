const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');

const PORT = 3456;
const POSTS_DIR = path.join(__dirname, '..', 'src', 'content', 'posts');
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.webp': 'image/webp'
};

function parseYAML(frontmatter) {
  const data = {};
  const lines = frontmatter.split('\n');
  let currentKey = '';
  let inArray = false;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('- ') && inArray) {
      const array = data[currentKey] || [];
      array.push(trimmed.substring(2).trim());
      data[currentKey] = array;
    } else if (trimmed.includes(':')) {
      inArray = false;
      const colonIndex = trimmed.indexOf(':');
      const key = trimmed.substring(0, colonIndex).trim();
      let value = trimmed.substring(colonIndex + 1).trim();

      if (value === '') {
        currentKey = key;
        inArray = true;
        data[key] = [];
      } else {
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (!isNaN(value) && value !== '') value = Number(value);
        data[key] = value;
      }
    }
  }
  return data;
}

function toYAML(data) {
  const lines = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === 'content') continue;
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      value.forEach(item => lines.push(`  - ${item}`));
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  return lines.join('\n');
}

async function getPosts() {
  try {
    const files = await fs.readdir(POSTS_DIR);
    const posts = [];

    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const content = await fs.readFile(path.join(POSTS_DIR, file), 'utf-8');
      const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (match) {
        const data = parseYAML(match[1]);
        posts.push({
          id: file.replace('.md', ''),
          title: data.title || '',
          description: data.description || '',
          publishedAt: data.publishedAt || '',
          category: data.category || '',
          tags: data.tags || [],
          draft: data.draft || false,
          cover: data.cover || '',
          content: match[2].trim()
        });
      }
    }

    return posts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  } catch (error) {
    return [];
  }
}

async function savePost(post) {
  const filename = `${post.id}.md`;
  const filepath = path.join(POSTS_DIR, filename);

  const frontmatter = {
    title: post.title,
    description: post.description,
    publishedAt: post.publishedAt,
    category: post.category,
    tags: post.tags,
    draft: post.draft
  };

  if (post.cover) {
    frontmatter.cover = post.cover;
  }

  const content = `---\n${toYAML(frontmatter)}\n---\n\n${post.content}`;
  await fs.writeFile(filepath, content, 'utf-8');
}

async function ensureDir(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

function generateUniqueFilename(originalName) {
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `upload-${timestamp}-${random}${ext}`;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (pathname === '/api/posts' && req.method === 'GET') {
    const posts = await getPosts();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(posts));
    return;
  }

  if (pathname === '/api/posts' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const post = JSON.parse(body);
        await savePost(post);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  if (pathname.startsWith('/api/posts/') && req.method === 'GET') {
    const id = decodeURIComponent(pathname.replace('/api/posts/', ''));
    const posts = await getPosts();
    const post = posts.find(p => p.id === id);
    if (post) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(post));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
    return;
  }

  if (pathname === '/api/upload' && req.method === 'POST') {
    try {
      await ensureDir(IMAGES_DIR);
      const contentType = req.headers['content-type'];
      if (!contentType || !contentType.includes('multipart/form-data')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '需要 multipart/form-data' }));
        return;
      }

      const boundary = contentType.split('boundary=')[1];
      if (!boundary) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '缺少 boundary' }));
        return;
      }

      let chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const boundaryBuffer = Buffer.from(`--${boundary}`);
          const parts = [];
          let start = 0;
          while (true) {
            const idx = buffer.indexOf(boundaryBuffer, start);
            if (idx === -1) break;
            if (start > 0) {
              const part = buffer.slice(start, idx);
              parts.push(part);
            }
            start = idx + boundaryBuffer.length;
          }

          for (const part of parts) {
            const headerEnd = part.indexOf('\r\n\r\n');
            if (headerEnd === -1) continue;
            
            const header = part.slice(0, headerEnd).toString();
            const data = part.slice(headerEnd + 4);
            const cleanData = data.slice(0, data.length - 2);
            
            const filenameMatch = header.match(/filename="([^"]+)"/);
            if (filenameMatch) {
              const originalName = filenameMatch[1];
              const filename = generateUniqueFilename(originalName);
              const filepath = path.join(IMAGES_DIR, filename);
              
              await fs.writeFile(filepath, cleanData);
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: true, 
                url: `/images/${filename}`,
                filename: filename
              }));
              return;
            }
          }
          
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '未找到文件' }));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  if (pathname.startsWith('/images/')) {
    const filename = pathname.replace('/images/', '');
    const filepath = path.join(IMAGES_DIR, filename);
    try {
      const content = await fs.readFile(filepath);
      const ext = path.extname(filepath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'image/jpeg';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Image Not Found');
    }
    return;
  }

  if (pathname.startsWith('/api/')) {
    console.log('API route not found:', pathname);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'API route not found' }));
    return;
  }

  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(__dirname, filePath);

  try {
    const content = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    console.log('File not found:', filePath);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  访问地址: http://localhost:${PORT}`);
  console.log(`========================================\n`);
});
