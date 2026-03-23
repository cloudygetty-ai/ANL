// metro.config.js
// Monorepo support for @cloudygetty/api-client shared package
// Works with Expo SDK 51+

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch both this package and the shared api-client
config.watchFolders = [workspaceRoot];

// Resolve node_modules from both roots (monorepo hoisting)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Alias @cloudygetty/api-client to local source if developing it
config.resolver.extraNodeModules = {
  '@cloudygetty/api-client': path.resolve(workspaceRoot, 'packages/api-client/src'),
};

// Ensure symlinks are followed (yarn workspaces / npm link)
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
