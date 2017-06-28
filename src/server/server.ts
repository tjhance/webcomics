import log4js = require('log4js');
import http_server = require('./http_server');
import fs = require('fs');

declare var process: any;

log4js.replaceConsole();

// Read the config file from the command-line argument
if (process.argv.length != 3) {
  console.log("Expected: one argument, config filename (e.g. 'config/development.json')");
  process.exit(1);
}

const configFilename = process.argv[2];
const config = JSON.parse(fs.readFileSync(configFilename) as any);

http_server.init(config);
