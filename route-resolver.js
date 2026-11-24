const fs = require('node:fs');
const path = require('node:path');

const BLOCKED_EXACT = new Set([
  '/server.js',
  '/route-resolver.js',
  '/route-resolver.test.js',
  '/package.json',
  '/package-lock.json',
  '/metadata.json',
  '/start_server.cmd',
]);

const BLOCKED_PREFIXES = ['/node_modules', '/.git', '/.playwright-cli', '/.aistudio'];

function safeDecode(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

function isBlockedPath(rawPathname) {
  const decoded = safeDecode(rawPathname || '/');
  if (decoded === null) return true;
  if (decoded.includes('\0')) return true;

  if (decoded.split(/[\\/]/).includes('..')) {
    return true;
  }

  const normalized = path.posix.normalize(decoded);
  if (normalized.startsWith('..') || normalized.includes('/../')) {
    return true;
  }

  const lower = normalized.toLowerCase();
  if (BLOCKED_EXACT.has(lower)) return true;

  for (const prefix of BLOCKED_PREFIXES) {
    if (lower === prefix || lower.startsWith(prefix + '/')) {
      return true;
    }
  }

  const segments = lower.split('/').filter(Boolean);
  if (segments.some((seg) => seg.startsWith('.'))) {
    return true;
  }

  if (lower.endsWith('.py')) {
    return true;
  }

  return false;
}

function isWithinRoot(rootDir, candidatePath) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedCandidate = path.resolve(candidatePath);
  return (
    resolvedCandidate === resolvedRoot ||
    resolvedCandidate.startsWith(resolvedRoot + path.sep)
  );
}

function resolveHtmlFile(rootDir, rawPathname, existsFn = fs.existsSync) {
  if (isBlockedPath(rawPathname)) return null;

  const decoded = safeDecode(rawPathname || '/');
  if (decoded === null) return null;

  const normalized = path.posix.normalize(decoded);
  if (normalized === '/' || normalized === '') {
    const indexPath = path.join(rootDir, 'index.html');
    return existsFn(indexPath) ? indexPath : null;
  }

  const trimmed = normalized.replace(/\/+$/, '');
  const relative = trimmed.replace(/^\/+/, '');
  if (!relative) {
    const indexPath = path.join(rootDir, 'index.html');
    return existsFn(indexPath) ? indexPath : null;
  }

  const candidates = [];
  if (relative.toLowerCase().endsWith('.html')) {
    candidates.push(path.join(rootDir, relative));
  } else {
    candidates.push(path.join(rootDir, `${relative}.html`));
    candidates.push(path.join(rootDir, relative, 'index.html'));
  }

  for (const candidate of candidates) {
    if (isWithinRoot(rootDir, candidate) && existsFn(candidate)) {
      return candidate;
    }
  }

  return null;
}

module.exports = {
  isBlockedPath,
  resolveHtmlFile,
};
