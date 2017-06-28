#!/bin/bash

npm install

grunt ts:server

#nodemon --ignore node_modules -V src/server/server.ts config/development.json
#nodemon --ignore node_modules --watch 'src/server/**/*.ts' --ignore 'src/**/*.spec.ts' --exec 'ts-node' -V src/server/server.ts config/development.json
nodemon --ignore node_modules -V compiled/server.js config/development.json
