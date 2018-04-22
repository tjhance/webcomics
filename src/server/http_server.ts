import express = require('express');
import morgan = require('morgan');
import bodyParser = require('body-parser');
import compression = require('compression');
import http = require('http');
import webcomics = require('./webcomics');

declare var __dirname: string;

export function init(config: any) {
  const app = express();
  app.use(compression());
  app.use(morgan('combined'));
  app.use(bodyParser.urlencoded());

  const STATIC_ROOT = __dirname + "/../src/static/"
  console.log('static root is ' + STATIC_ROOT);
  app.use("/static", express.static(STATIC_ROOT));

  app.get("/comicview", (req, res) => {
    sendAppWithData(res, {});
  });

  app.get("/home", home);
  app.get("/", home);

  app.post("/get_info", (req, res) => {
    webcomics.get_info(req, res);
  });

  app.post("/process_form", (req, res) => {
    webcomics.process_form(req, res);
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

function home(req: any, res: any) {
  const html =
`<!doctype>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Language" content="en">
    <title>Infinite Comic</title>

    <!-- stylesheets -->
    <link rel="stylesheet" type="text/css" href="/static/css/style.css" />

    <!-- javascript app code -->
    <script type="text/javascript" src="/static/bundle.js"></script>
  </head>
  <body>
    <form method="POST" action="/process_form">
      <div class="home-form-outer">
        <div class="home-form">
          <div class="home-form-1">
            Enter a comic URL.
          </div>
          <div class="home-form-2">
            <input name="comic_url" placeholder="http://www.girlgeniusonline.com/comic.php?date=20021104"
                class="comic_url_input">
          </div>
          <div class="home-form-3">
            <input type="submit" value="Read!" class="submit_button">
          </div>
        </div>
      </div>
    </form>
    <p><div class="linksbox">
      <span class="linksbox-header">Supported Comics</span> <br> <br>
      Girl Genius <a href="/comicview?comic=girlgenius&index=20021104">(start)</a> <br>
      Dr. McNinja <a href="/comicview?comic=drmcninja&index=issue-one-half-0p1">(start)</a> <br>
      Everblue <a href="/comicview?comic=everblue&index=1">(start)</a> <br>
      Gunnerkrigg Court <a href="/comicview?comic=gunnerkriggcourt&index=1">(start)</a>
    </div></p>
    <div class="history">
    </div>
    <script type="text/javascript">
      window.initHome();
    </script>
  </body>
</html>
`;
  res.header("Content-Type", "text/html");
  res.send(html);
}
