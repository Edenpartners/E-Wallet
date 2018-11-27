#!/usr/bin/env node

const path = require('path');
const fs = require('fs-extra');
const shell = require('shelljs');

const dryRun = false;
const cleanTarget = process.argv[2];

function resolvePath(pathItem) {
  if (typeof pathItem === 'string') {
    return path.join(__dirname, pathItem);
  }

  // var pathType = 'relative';
  // var pathType = 'host';
  // var pathType = 'absolute';
  var pathType = 'host';
  if (pathItem) {
    if (pathItem.type) {
      pathType = pathItem.type;
    }
  }

  if (pathType === 'host') {
    return path.join(__dirname, pathItem.value);
  }
  if (pathType === 'relative') {
    return path.join(__dirname, configDir, pathItem.value);
  }

  return path.join(pathItem.value);
}

function deleteDir(path) {
  if (!path) return;
  path = resolvePath(path);
  if (fs.existsSync(path)) {
    console.log(`[remove] '${path}'...`);
    if (!dryRun) {
      fs.removeSync(path); // remove previous app directory
    }
  }
}

if (!cleanTarget || cleanTarget === 'platforms') {
  deleteDir('../platforms');
}

if (!cleanTarget || cleanTarget === 'plugins') {
  deleteDir('../plugins');
}

if (!cleanTarget || cleanTarget === 'node_modules') {
  deleteDir('../node_modules');
}

if (!cleanTarget || cleanTarget === 'firebase-mobile-resources') {
  deleteDir('../google-services.json');
  deleteDir('../GoogleService-Info.plist');
}
