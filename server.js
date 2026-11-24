const path = require('node:path');
const express = require('express');
const { isBlockedPath, resolveHtmlFile } = require('./route-resolver');

const app = express();
const ROOT_DIR = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.disable('x-powered-by');

app.use((req, res, next) => {
  if (isBlockedPath(req.path)) {
    return res.status(404).send('Not Found');
  }
  next();
});

app.use(
  express.static(ROOT_DIR, {
    dotfiles: 'ignore',
    index: 'index.html',
    extensions: ['html'],
    redirect: false,
    setHeaders(res, filePath) {
      if (filePath.endsWith('.buf') || filePath.endsWith('.exr')) {
        res.setHeader('Content-Type', 'application/octet-stream');
      }
    },
  })
);

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }
  const htmlFile = resolveHtmlFile(ROOT_DIR, req.path);
  if (htmlFile) {
    if (req.path.length > 1 && req.path.endsWith('/')) {
      const target = req.path.replace(/\/+$/, '');
      const queryIndex = req.originalUrl.indexOf('?');
      const query = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';
      return res.redirect(301, target + query);
    }
    return res.sendFile(htmlFile);
  }
  return res.status(404).send('Not Found');
});

app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
