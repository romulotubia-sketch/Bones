import { Buffer } from 'buffer';
import type { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

interface ZipEntry {
  name: string;
  data: Buffer;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date = new Date()): { dosTime: number; dosDate: number } {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  const dosTime = ((hours & 0x1f) << 11) | ((minutes & 0x3f) << 5) | (seconds & 0x1f);
  const dosDate = (((year - 1980) & 0x7f) << 9) | ((month & 0x0f) << 5) | (day & 0x1f);
  return { dosTime, dosDate };
}

function createZipBuffer(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  const { dosTime, dosDate } = getDosDateTime();

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name.replace(/\\/g, '/'), 'utf8');
    const rawData = entry.data;
    const crc = crc32(rawData);
    const deflated = zlib.deflateRawSync(rawData, { level: 6 });

    const useDeflate = deflated.length < rawData.length;
    const method = useDeflate ? 8 : 0;
    const compData = useDeflate ? deflated : rawData;

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed (2.0)
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compData.length, 18);
    localHeader.writeUInt32LE(rawData.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra field length
    nameBuf.copy(localHeader, 30);

    // Central directory header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0x0800, 8); // UTF-8 filename flag
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compData.length, 20);
    centralHeader.writeUInt32LE(rawData.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra len
    centralHeader.writeUInt16LE(0, 32); // comment len
    centralHeader.writeUInt16LE(0, 34); // disk number
    centralHeader.writeUInt16LE(0, 36); // internal attrs
    centralHeader.writeUInt32LE(0, 38); // external attrs
    centralHeader.writeUInt32LE(offset, 42); // relative offset of local header
    nameBuf.copy(centralHeader, 46);

    localParts.push(localHeader, compData);
    centralParts.push(centralHeader);
    offset += localHeader.length + compData.length;
  }

  const centralDirBuffer = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // start disk
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirBuffer.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20); // comment len

  return Buffer.concat([...localParts, centralDirBuffer, eocd]);
}

function collectFilesRecursive(
  baseDir: string,
  currentDir: string,
  ignoreNames: Set<string>,
  prefix = '',
): ZipEntry[] {
  const results: ZipEntry[] = [];
  if (!fs.existsSync(currentDir)) return results;

  const dirents = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const dirent of dirents) {
    if (ignoreNames.has(dirent.name)) continue;
    const fullPath = path.join(currentDir, dirent.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (dirent.isDirectory()) {
      results.push(...collectFilesRecursive(baseDir, fullPath, ignoreNames, prefix));
    } else if (dirent.isFile()) {
      const zipPath = prefix ? `${prefix}/${relPath}` : relPath;
      results.push({
        name: zipPath,
        data: fs.readFileSync(fullPath),
      });
    }
  }
  return results;
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.json':
      return 'application/json';
    default:
      return 'application/octet-stream';
  }
}

async function ensureProductionDist(rootDir: string): Promise<string> {
  const distDir = path.join(rootDir, 'dist');
  const indexHtmlPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    const { build } = await import('vite');
    await build({ root: rootDir, logLevel: 'warn' });
  }
  return distDir;
}

let cachedStandalone: { mtimeMs: number; buffer: Buffer } | null = null;
let cachedBuildZip: { mtimeMs: number; buffer: Buffer } | null = null;

async function buildStandaloneGameHtml(rootDir: string): Promise<Buffer> {
  const distDir = await ensureProductionDist(rootDir);
  const indexHtmlPath = path.join(distDir, 'index.html');
  const stat = fs.statSync(indexHtmlPath);

  if (cachedStandalone && cachedStandalone.mtimeMs === stat.mtimeMs) {
    return cachedStandalone.buffer;
  }

  let html = fs.readFileSync(indexHtmlPath, 'utf8');

  // Collect all binary/media assets inside dist/ so portraits & sprites work offline in 1 file
  const distFiles = collectFilesRecursive(distDir, distDir, new Set(['index.html']));
  const dataUriMap = new Map<string, string>();

  for (const entry of distFiles) {
    const ext = path.extname(entry.name).toLowerCase();
    if (ext === '.js' || ext === '.css' || ext === '.html') continue;
    const mime = getMimeType(entry.name);
    const dataUri = `data:${mime};base64,${entry.data.toString('base64')}`;
    dataUriMap.set(`/${entry.name}`, dataUri);
    dataUriMap.set(`./${entry.name}`, dataUri);
  }

  const inlineAssetUrls = (text: string): string => {
    let out = text;
    for (const [assetUrl, dataUri] of dataUriMap.entries()) {
      if (out.includes(assetUrl)) {
        out = out.split(assetUrl).join(dataUri);
      }
    }
    return out;
  };

  // Remove manifest link so file:// opens cleanly without CORS noise
  html = html.replace(/<link[^>]+rel=["']manifest["'][^>]*>\s*/gi, '');

  // Inline built stylesheets
  html = html.replace(
    /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/gi,
    (fullMatch, href: string) => {
      const cleanRel = href.replace(/^\.?\//, '');
      const cssPath = path.join(distDir, cleanRel);
      if (!fs.existsSync(cssPath)) return fullMatch;
      const cssContent = inlineAssetUrls(fs.readFileSync(cssPath, 'utf8'));
      return `<style>\n${cssContent}\n</style>`;
    },
  );

  // Inline built JS module bundles
  html = html.replace(
    /<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/gi,
    (fullMatch, src: string) => {
      const cleanRel = src.replace(/^\.?\//, '');
      const jsPath = path.join(distDir, cleanRel);
      if (!fs.existsSync(jsPath)) return fullMatch;
      const jsContent = inlineAssetUrls(fs.readFileSync(jsPath, 'utf8')).replace(
        /<\/script/gi,
        '<\\/script',
      );
      return `<script type="module">\n${jsContent}\n</script>`;
    },
  );

  const buffer = Buffer.from(html, 'utf8');
  cachedStandalone = { mtimeMs: stat.mtimeMs, buffer };
  return buffer;
}

async function buildProductionDistZip(rootDir: string): Promise<Buffer> {
  const distDir = await ensureProductionDist(rootDir);
  const indexHtmlPath = path.join(distDir, 'index.html');
  const stat = fs.statSync(indexHtmlPath);

  if (cachedBuildZip && cachedBuildZip.mtimeMs === stat.mtimeMs) {
    return cachedBuildZip.buffer;
  }

  const entries = collectFilesRecursive(distDir, distDir, new Set(), 'hearth-and-bone-web');
  const buffer = createZipBuffer(entries);
  cachedBuildZip = { mtimeMs: stat.mtimeMs, buffer };
  return buffer;
}

function buildSourceCodeZip(rootDir: string): Buffer {
  const ignore = new Set([
    'node_modules',
    'dist',
    '.git',
    '.aistudio',
    '.DS_Store',
    'bun.lock',
  ]);
  const entries = collectFilesRecursive(rootDir, rootDir, ignore, 'hearth-and-bone-source');
  return createZipBuffer(entries);
}

function sendDownloadBuffer(
  res: Response,
  buffer: Buffer,
  filename: string,
  contentType: string,
): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', String(buffer.length));
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).end(buffer);
}

export function registerDownloadRoutes(app: Express, rootDir: string): void {
  const handleGameDownload = async (_req: Request, res: Response) => {
    try {
      const htmlBuf = await buildStandaloneGameHtml(rootDir);
      sendDownloadBuffer(
        res,
        htmlBuf,
        'hearth-and-bone.html',
        'text/html; charset=utf-8',
      );
    } catch (err) {
      console.error('Failed to build standalone game download:', err);
      res.status(500).json({ error: 'Failed to prepare standalone game file.' });
    }
  };

  const handleSourceZipDownload = (_req: Request, res: Response) => {
    try {
      const zipBuf = buildSourceCodeZip(rootDir);
      sendDownloadBuffer(
        res,
        zipBuf,
        'hearth-and-bone-source.zip',
        'application/zip',
      );
    } catch (err) {
      console.error('Failed to build source zip download:', err);
      res.status(500).json({ error: 'Failed to prepare source code archive.' });
    }
  };

  const handleBuildZipDownload = async (_req: Request, res: Response) => {
    try {
      const zipBuf = await buildProductionDistZip(rootDir);
      sendDownloadBuffer(
        res,
        zipBuf,
        'hearth-and-bone-web-build.zip',
        'application/zip',
      );
    } catch (err) {
      console.error('Failed to build web build zip download:', err);
      res.status(500).json({ error: 'Failed to prepare web build archive.' });
    }
  };

  app.get('/api/download/game', handleGameDownload);
  app.get('/download/hearth-and-bone.html', handleGameDownload);

  app.get('/api/download/source.zip', handleSourceZipDownload);
  app.get('/download/hearth-and-bone-source.zip', handleSourceZipDownload);

  app.get('/api/download/build.zip', handleBuildZipDownload);
  app.get('/download/hearth-and-bone-web-build.zip', handleBuildZipDownload);
}
