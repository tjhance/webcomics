import express = require('express');
import morgan = require('morgan');
//import bodyParser = require('body-parser');
import compression = require('compression');

declare var __dirname: string;

export function init(config: any) {
  const app = express();
  app.use(compression());
  app.use(morgan('combined'));
  //app.use(bodyParser());

  const STATIC_ROOT = __dirname + "/../static/"
  app.use("/static", express.static(STATIC_ROOT));
}
