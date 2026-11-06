const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (process.env.METRO_MAX_WORKERS) {
  config.maxWorkers = Number(process.env.METRO_MAX_WORKERS);
}

module.exports = config;

