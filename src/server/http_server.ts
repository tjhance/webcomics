import express = require('express');
import morgan = require('morgan');
//import bodyParser = require('body-parser');
import compression = require('compression');
import http = require('http');
import webcomics = require('./webcomics');

declare var __dirname: string;

export function init(config: any) {
  const app = express();
  app.use(compression());
  app.use(morgan('combined'));
  //app.use(bodyParser());

  const STATIC_ROOT = __dirname + "/../src/static/"
  console.log('static root is ' + STATIC_ROOT);
  app.use("/static", express.static(STATIC_ROOT));

  app.get("/comicview", (req, res) => {
    sendAppWithData(res, {});
  });

  app.post("/get_info", (req, res) => {
    webcomics.get_info(req, res);
  });

  const server = (http as any).Server(app);
  server.listen(config.port);
  console.info(`Initialized webserver on port ${config.port}`);
}

const APP_TEMPLATE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Infinite Comic</title>

    <!-- stylesheets -->
    <link rel="stylesheet" type="text/css" href="/static/css/style.css" />

    <!-- non-static data for the page -->
    <script type="text/javascript">
        var PAGE_DATA = JSON.parse(decodeURIComponent("REPLACE_ME"));
    </script>

    <!-- javascript app code -->
    <script type="text/javascript" src="/static/bundle.js"></script>
  </head>
  <body>
    <div class="view-container"></div>
    <script type="text/javascript">
        window.initApp();
    </script>
  </body>
</html>`;

function sendAppWithData(res: any, data: any) {
  const jsonData = JSON.stringify(data);
  const encodedData = encodeURIComponent(jsonData);
  const html = APP_TEMPLATE.replace('REPLACE_ME', encodedData);
  res.header("Content-Type", "text/html");
  res.send(html);
}
