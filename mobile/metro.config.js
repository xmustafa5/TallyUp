const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Lock Metro to mobile directory only -- prevent crawling up to monorepo root
config.projectRoot = __dirname;
config.watchFolders = [__dirname];

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
