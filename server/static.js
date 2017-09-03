import fs from 'fs';
import path from 'path';

import marked from 'marked';

export default function addStaticRoutes(app) {
  app.get('/', (req, res, next) => {
    // Serve the readme
    fs.readFile(
      path.resolve(__dirname, '..', 'readme.md'),
      'utf8',
      (err, readmeTxt) => {
        if (err) return next(err);

        const readmeHtml = `
        <html>
          <head>
            <title>Battlebots!</title>
            <style>
            .markdown-body {
              box-sizing: border-box;
              min-width: 200px;
              max-width: 980px;
              margin: 0 auto;
              padding: 45px;
            }
            </style>
            <link rel="stylesheet" href="theme.css">
          </head>
          <body>
            <main class="markdown-body">
              ${marked(readmeTxt)}
            </main>
          </body>
        </html>
        `;
        res.end(readmeHtml);
      }
    );
  });

  app.get('/theme.css', function (req, res) {
    res.sendFile(path.resolve(
      __dirname,
      '..',
      'node_modules',
      'github-markdown-css',
      'github-markdown.css'
    ));
  });

  app.get('/favicon.ico', function (req, res) {
    res.sendFile(path.resolve(__dirname, '..', 'favicon.ico'));
  });
}
