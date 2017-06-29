./node_modules/grunt-cli/bin/grunt -v ts

# generate a config file using the info passed in through environment variables
config=config/temp-config-heroku.json
echo "{\"port\": \"$PORT\"}" > $config

# start the server
NODE_ENV=production node compiled/server.js $config
