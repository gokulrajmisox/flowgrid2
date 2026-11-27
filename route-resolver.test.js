const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { isBlockedPath, resolveHtmlFile } = require('./route-resolver');

const ROOT = '/app/site';

function makeExists(files) {
  const set = new Set(files.map((f) => path.resolve(ROOT, f)));
  return (p) => set.has(path.resolve(p));
}

test('blocks internal server, config, hidden, and python files', () => {
  assert.equal(isBlockedPath('/server.js'), true);
  assert.equal(isBlockedPath('/package.json'), true);
  assert.equal(isBlockedPath('/node_modules/express/index.js'), true);
  assert.equal(isBlockedPath('/.git/config'), true);
  assert.equal(isBlockedPath('/check_models.py'), true);
  assert.equal(isBlockedPath('/../etc/passwd'), true);
});

test('allows public site pages and assets', () => {
  assert.equal(isBlockedPath('/'), false);
  assert.equal(isBlockedPath('/about'), false);
  assert.equal(isBlockedPath('/projects/devin_ai.html'), false);
  assert.equal(isBlockedPath('/_astro/hoisted.81170750.js'), false);
  assert.equal(isBlockedPath('/assets/models/home/cross.buf'), false);
});

test('resolves root, clean URLs, trailing slashes, and project pages', () => {
  const exists = makeExists([
    'index.html',
    'about.html',
    'projects.html',
    'careers.html',
    'projects/devin_ai.html',
  ]);

  assert.equal(resolveHtmlFile(ROOT, '/', exists), path.join(ROOT, 'index.html'));
  assert.equal(resolveHtmlFile(ROOT, '/about', exists), path.join(ROOT, 'about.html'));
  assert.equal(resolveHtmlFile(ROOT, '/about/', exists), path.join(ROOT, 'about.html'));
  assert.equal(resolveHtmlFile(ROOT, '/careers', exists), path.join(ROOT, 'careers.html'));
  assert.equal(resolveHtmlFile(ROOT, '/careers/', exists), path.join(ROOT, 'careers.html'));
  assert.equal(resolveHtmlFile(ROOT, '/projects/', exists), path.join(ROOT, 'projects.html'));
  assert.equal(
    resolveHtmlFile(ROOT, '/projects/devin_ai', exists),
    path.join(ROOT, 'projects/devin_ai.html')
  );
  assert.equal(
    resolveHtmlFile(ROOT, '/projects/devin_ai/', exists),
    path.join(ROOT, 'projects/devin_ai.html')
  );
  assert.equal(
    resolveHtmlFile(ROOT, '/projects/devin_ai.html', exists),
    path.join(ROOT, 'projects/devin_ai.html')
  );
  assert.equal(resolveHtmlFile(ROOT, '/nonexistent', exists), null);
});
