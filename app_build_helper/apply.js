#!/usr/bin/env node

const replace = require('replace-in-file');

const path = require('path');
const fs = require('fs-extra');
const shell = require('shelljs');

console.log(process.argv);
const configDir = process.argv[2];

var dryRun = false;
var runOnlyConfigs = false;

function resolveDryRun(v) {
  if (v !== undefined && typeof v === 'string' &&
    v.toUpperCase() === 'DRYRUN') {
    dryRun = true;
  }
}

function resolveOnlyRootConfigs(v) {
  if (v !== undefined && typeof v === 'string' &&
    v.toUpperCase() === 'ONLY-CONFIG') {
    runOnlyConfigs = true;
  }
}

resolveDryRun(process.argv[3]);
resolveDryRun(process.argv[4]);
resolveOnlyRootConfigs(process.argv[3]);
resolveOnlyRootConfigs(process.argv[4]);

if (!configDir) {
  console.log('config argument does not exists!')
  return;
}

const configDirPath = path.join(__dirname, configDir);
if (!fs.existsSync(configDirPath)) {
  console.log(`config directory does not exists! - ${configDirPath}`)
  return;
}

const configPath = path.join(configDirPath, 'appConfig.json');
if (!fs.existsSync(configPath)) {
  console.log(`config file does not exists! - ${configPath}`)
  return;
}

console.log('working with : ' + configPath);
console.log('is dry mode ? : ' + dryRun);

const config = require(configPath);
const packageJsonPath = resolvePath('../package.json');
const packageJson = require(packageJsonPath);
const configXmlPath = resolvePath('../config.xml');
const configPathItem = { 'type': 'absolute', 'value': configXmlPath };

if (!config) {
  console.log(`config file does not exists! - ${configPath}`)
  return;
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

function isExists(path) {
  return fs.existsSync(resolvePath(path));
}

function copyDir(from, to, removeIfDestExists = true) {
  if (from === undefined || to === undefined) return;

  from = resolvePath(from);
  to = resolvePath(to);

  console.log(`[copy] '${from}' => '${to}'...`);

  if (!fs.existsSync(from)) {
    console.log(`file does not exists : ${from}`);
    return false; // nothing to do
  }

  if (fs.existsSync(to) && removeIfDestExists) {
    //console.log(`[remove] '${to}'...`);
    if (!dryRun) {
      fs.removeSync(to); // remove previous app directory      
    }
  }

  if (!dryRun) {
    fs.copySync(from, to);
  }
  return true;
}

function printComment(obj) {
  if (obj._COMMENT) {
    console.log('* ' + obj._COMMENT);
  }
}

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

function runReplaceInFile(pathItem, source, replaceText) {
  try {
    var path = resolvePath(pathItem);

    console.log(`[replace] '${path}'... ${source}`);
    console.log(replaceText);

    const options = {
      files: [path],
      from: new RegExp(source),
      to: replaceText,
      dry: dryRun
    };

    const changes = replace.sync(options);
    console.log('Modified files:', changes);
  } catch (e) {
    console.log(e);
  }
}

function runReplaceCordovaPluginVariable(pathItem, pluginId, varName, valueOfVar) {
  // runReplaceInFile(pathItem,
  //   '(<plugin[\\s]+name="' + pluginId +
  //   '".*[\\r\\n\\s]+.*<variable name="' + varName +
  //   '"[\\s]+value=")(.*)("[\\r\\n\\s]*/>[\\r\\n\\s.]+</plugin>)',
  //   '$1' + valueOfVar + '$2');

  runReplaceInFile(pathItem,
    '(<variable name="' + varName + '"[\\s]+value=")(.*)("[\\r\\n\\s]*/>)',
    '$1' + valueOfVar + '$3');
}

function runReplaceCordovaPreferenceVariable(pathItem, varName, valueOfVar) {
  runReplaceInFile(
    pathItem,
    '(<preference[\\s]+name="' + varName + '"[\\s]+value=")(.*)("[\\r\\n\\s]*/>)',
    '$1' + valueOfVar + '$3'
  );
}

function runReplaceCordovaAndroidString(pathItem, varName, valueOfVar) {
  runReplaceInFile(
    pathItem,
    '(<string[\\s]+name="' + varName + '"[\\s]*>)(.*)(</string>)',
    '$1' + valueOfVar + '$3'
  );
}

function runReplaceCordovaAndPackagePluginVariable(configPathItem, packageJson, pluginId,
  varName, valueOfVar) {
  runReplaceCordovaPluginVariable(configPathItem, pluginId,
    varName, valueOfVar);

  try {
    if (packageJson.cordova.plugins[pluginId]) {
      console.log('[replace packageJson] ' + pluginId + ' => ' + valueOfVar);
      packageJson.cordova.plugins[pluginId][varName] = valueOfVar;
    }
  } catch (e) {
    console.log(e);
  }
}

function run() {
  if (!runOnlyConfigs && config.deletes) {
    config.deletes.forEach((item) => {
      printComment(item);
      if (item.path) {
        deleteDir(item.path);
      }
    });
  }

  if (!runOnlyConfigs && config.copies) {
    config.copies.forEach((item) => {
      printComment(item);
      if (item.path && item.dest) {
        copyDir(item.path, item.dest);
      }
    });
  }

  if (!runOnlyConfigs && config.regexes) {
    config.regexes.forEach((item) => {
      printComment(item);
      if (item.dest && item.source && typeof item.replace === 'string') {
        runReplaceInFile(item.dest, item.source, item.replace);
      }
    });
  }

  if (!runOnlyConfigs && config.jsons) {
    config.jsons.forEach((item) => {});
  }

  if (config.firebase) {
    if (fs.existsSync(configXmlPath)) {

      if (config.firebase.auth && config.firebase.auth.FIREBASE_AUTH_VERSION) {
        const authPluginId = 'cordova-plugin-firebase-authentication';

        runReplaceCordovaAndPackagePluginVariable(configPathItem, packageJson, authPluginId,
          'FIREBASE_AUTH_VERSION', config.firebase.auth.FIREBASE_AUTH_VERSION);
      }

      if (config.firebase.twitter) {
        const twitterPluginId = 'twitter-connect-plugin';
        const twitter = config.firebase.twitter;

        runReplaceCordovaAndPackagePluginVariable(configPathItem, packageJson, twitterPluginId,
          'FABRIC_KEY', twitter.FABRIC_KEY);
        runReplaceCordovaAndPackagePluginVariable(configPathItem, packageJson, twitterPluginId,
          'TWITTER_KEY', twitter.TWITTER_KEY);
        runReplaceCordovaAndPackagePluginVariable(configPathItem, packageJson, twitterPluginId,
          'TWITTER_SECRET', twitter.TWITTER_SECRET);
        runReplaceCordovaPreferenceVariable(configPathItem, 'FABRIC_KEY', twitter.FABRIC_KEY);
        runReplaceCordovaPreferenceVariable(configPathItem, 'TwitterConsumerKey', twitter.TWITTER_KEY);
        runReplaceCordovaPreferenceVariable(configPathItem, 'TwitterConsumerSecret', twitter.TWITTER_SECRET);
      }

      if (config.firebase.facebook) {
        const facebookPluginId = 'cordova-plugin-facebook4';
        const facebook = config.firebase.facebook;

        runReplaceCordovaAndPackagePluginVariable(configPathItem, packageJson, facebookPluginId,
          'APP_ID', facebook.APP_ID);
        runReplaceCordovaAndPackagePluginVariable(configPathItem, packageJson, facebookPluginId,
          'APP_NAME', facebook.APP_NAME);
        runReplaceCordovaAndroidString(configPathItem, 'fb_app_id', facebook.APP_ID);
        runReplaceCordovaAndroidString(configPathItem, 'fb_app_name', facebook.APP_NAME);
      }

      if (config.firebase.google) {
        const googlePluginId = 'cordova-plugin-googleplus';
        const google = config.firebase.google;

        runReplaceCordovaAndPackagePluginVariable(configPathItem, packageJson, googlePluginId,
          'PLAY_SERVICES_VERSION', google.PLAY_SERVICES_VERSION);
        runReplaceCordovaAndPackagePluginVariable(configPathItem, packageJson, googlePluginId,
          'REVERSED_CLIENT_ID', google.REVERSED_CLIENT_ID);
        runReplaceCordovaAndPackagePluginVariable(configPathItem, packageJson, googlePluginId,
          'WEB_APPLICATION_CLIENT_ID', google.WEB_APPLICATION_CLIENT_ID);
      }
    }
  } // end of config firebase
}

run();

const stringifiedNpmStyle = JSON.stringify(packageJson, null, 2) + '\n';

console.log('overwriting package.json => ' + packageJsonPath + ' ...');
if (!dryRun) {
  fs.writeFileSync(packageJsonPath, stringifiedNpmStyle);
}

console.log(`
apply.js: finished applying the ${configDir} distribution.
`);
