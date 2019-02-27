#!/usr/bin/env node

const replace = require('replace-in-file');

const path = require('path');
const fs = require('fs-extra');
const shell = require('shelljs');

const findInFiles = require('find-in-files');

console.log(process.argv);
const configDir = process.argv[2];

const PRIORITY_ONLY_CONFIG = 1000;
const PRIORITY_ONLY_NORMAL = 0;

var dryRun = false;
var runOnlyConfigs = false;
var currentMinPriority = PRIORITY_ONLY_NORMAL;

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
    currentMinPriority = PRIORITY_ONLY_CONFIG;
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

function getPriority(item) {
  if (item.priority) {
    return parseInt(item.priority, 0);
  }

  return PRIORITY_ONLY_NORMAL;
}

function deleteDir(p, path) {
  if (p < currentMinPriority) {
    return;
  }

  if (!path) return;
  path = resolvePath(path);
  if (fs.existsSync(path)) {
    console.log(`[remove] '${path}'...`);
    if (!dryRun) {
      fs.removeSync(path); // remove previous app directory
    }
  }
}

function copyDir(p, from, to, removeIfDestExists = true) {
  if (p < currentMinPriority) {
    return;
  }

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
  if (getPriority(obj) < currentMinPriority) {
    return;
  }

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

function conditionsDeterminer(pathItem, conditions) {
  var result = true;

  if (conditions) {
    for (var i = 0; i < conditions.length; i++) {
      var cond = conditions[i];
      if (cond.has) {
        if (!conditionMatcher(pathItem, cond.has)) {
          result = false;
          break;
        }
      } else if (cond.hasNot) {
        if (conditionMatcher(pathItem, cond.hasNot)) {
          result = false;
          break;
        }
      }
    }
  }

  console.log(`[determine conditions result] '${result}'`);
  return result;
}

//return true if file's content has pattern
function conditionMatcher(pathItem, pattern) {
  var targetPath = resolvePath(pathItem);
  var targetFolder = path.dirname(targetPath);
  var targetFileName = path.basename(targetPath);

  console.log(`[find pattern] '${pattern}'`);

  var found = false;
  if (fs.existsSync(targetPath)) {
    var fileContents = fs.readFileSync(targetPath, 'utf8');
    if (fileContents) {
      var fileContentsStr = fileContents.toString();
      if (fileContentsStr) {
        var searchResult = fileContentsStr.search(pattern);
        if (searchResult >= 0) {
          found = true;
        }
      }
    }
  }

  return found;
}

function runReplaceInFile(p, pathItem, source, replaceText, conditions) {
  if (p < currentMinPriority) {
    return;
  }

  function innerWorker(pathItem, source, replaceText) {
    try {
      var targetPath = resolvePath(pathItem);

      console.log(`[replace] '${targetPath}'... ${source}`);
      console.log(replaceText);

      const options = {
        files: [targetPath],
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

  if (conditions) {
    var targetPath = resolvePath(pathItem);

    if (conditionsDeterminer(pathItem, conditions)) {
      innerWorker(pathItem, source, replaceText);
    }
  } else {
    innerWorker(pathItem, source, replaceText);
  }
}

function runReplaceCordovaPluginVariable(p, pathItem, pluginId, varName, valueOfVar) {
  // runReplaceInFile(pathItem,
  //   '(<plugin[\\s]+name="' + pluginId +
  //   '".*[\\r\\n\\s]+.*<variable name="' + varName +
  //   '"[\\s]+value=")(.*)("[\\r\\n\\s]*/>[\\r\\n\\s.]+</plugin>)',
  //   '$1' + valueOfVar + '$2');

  runReplaceInFile(p, pathItem,
    '(<variable name="' + varName + '"[\\s]+value=")(.*)("[\\r\\n\\s]*/>)',
    '$1' + valueOfVar + '$3');
}

function runReplaceCordovaPreferenceVariable(p, pathItem, varName, valueOfVar) {
  runReplaceInFile(p,
    pathItem,
    '(<preference[\\s]+name="' + varName + '"[\\s]+value=")(.*)("[\\r\\n\\s]*/>)',
    '$1' + valueOfVar + '$3'
  );
}

function runReplaceCordovaAndroidString(p, pathItem, varName, valueOfVar) {
  runReplaceInFile(p,
    pathItem,
    '(<string[\\s]+name="' + varName + '"[\\s]*>)(.*)(</string>)',
    '$1' + valueOfVar + '$3'
  );
}

function runReplaceCordovaAndPackagePluginVariable(p, configPathItem, packageJson, pluginId,
  varName, valueOfVar) {
  runReplaceCordovaPluginVariable(p, configPathItem, pluginId,
    varName, valueOfVar);

  if (p < currentMinPriority) {
    return;
  }

  try {
    if (packageJson.cordova.plugins[pluginId]) {
      console.log('[replace packageJson] ' + pluginId + ' => ' + valueOfVar);
      packageJson.cordova.plugins[pluginId][varName] = valueOfVar;
    }
  } catch (e) {
    console.log(e);
  }
}

function runReplaceAndroidBuildGradlePackageVersion(p, pathItem, packageId, version) {
  runReplaceInFile(p,
    pathItem,
    "(\"" + packageId + ":)(.*)(\")",
    '$1' + version + '$3'
  );
}

function run() {
  if (config.deletes) {
    config.deletes.forEach((item) => {
      printComment(item);
      if (item.path) {
        deleteDir(getPriority(item), item.path);
      }
    });
  }

  if (config.copies) {
    config.copies.forEach((item) => {
      printComment(item);
      if (item.path && item.dest) {
        copyDir(getPriority(item), item.path, item.dest);
      }
    });
  }

  if (config.regexes) {
    config.regexes.forEach((item) => {
      printComment(item);
      if (item.dest && item.source && typeof item.replace === 'string') {
        runReplaceInFile(getPriority(item), item.dest, item.source, item.replace, item.conditions);
      }
    });
  }

  if (config.jsons) {
    config.jsons.forEach((item) => {});
  }

  if (config.androidBuildGradleVersions) {
    config.androidBuildGradleVersions.forEach((item) => {
      printComment(item);
      if (item.dest && item.package && item.version) {
        runReplaceAndroidBuildGradlePackageVersion(getPriority(item), item.dest, item.package,
          item.version);
      }
    });
  }

  if (config.firebase) {
    if (fs.existsSync(configXmlPath)) {
      if (config.firebase.auth && config.firebase.auth.FIREBASE_AUTH_VERSION) {
        const authPluginId = 'cordova-plugin-firebase-authentication';

        runReplaceCordovaAndPackagePluginVariable(PRIORITY_ONLY_CONFIG, configPathItem, packageJson,
          authPluginId,
          'FIREBASE_AUTH_VERSION', config.firebase.auth.FIREBASE_AUTH_VERSION);
      }

      if (config.firebase.core && config.firebase.core.FIREBASE_CORE_VERSION) {
        const analyticsPluginId = 'cordova-plugin-firebase-analytics';

        runReplaceCordovaAndPackagePluginVariable(PRIORITY_ONLY_CONFIG, configPathItem, packageJson,
          analyticsPluginId,
          'FIREBASE_CORE_VERSION', config.firebase.core.FIREBASE_CORE_VERSION);
      }

      if (config.firebase.twitter) {
        const twitterPluginId = 'twitter-connect-plugin';
        const twitter = config.firebase.twitter;

        runReplaceCordovaAndPackagePluginVariable(PRIORITY_ONLY_CONFIG, configPathItem, packageJson,
          twitterPluginId,
          'FABRIC_KEY', twitter.FABRIC_KEY);
        runReplaceCordovaAndPackagePluginVariable(PRIORITY_ONLY_CONFIG, configPathItem, packageJson,
          twitterPluginId,
          'TWITTER_KEY', twitter.TWITTER_KEY);
        runReplaceCordovaAndPackagePluginVariable(PRIORITY_ONLY_CONFIG, configPathItem, packageJson,
          twitterPluginId,
          'TWITTER_SECRET', twitter.TWITTER_SECRET);
        runReplaceCordovaPreferenceVariable(PRIORITY_ONLY_CONFIG, configPathItem, 'FABRIC_KEY',
          twitter.FABRIC_KEY);
        runReplaceCordovaPreferenceVariable(PRIORITY_ONLY_CONFIG, configPathItem,
          'TwitterConsumerKey', twitter.TWITTER_KEY);
        runReplaceCordovaPreferenceVariable(PRIORITY_ONLY_CONFIG, configPathItem,
          'TwitterConsumerSecret', twitter.TWITTER_SECRET);
      }

      if (config.firebase.facebook) {
        const facebookPluginId = 'cordova-plugin-facebook4';
        const facebook = config.firebase.facebook;

        runReplaceCordovaAndPackagePluginVariable(PRIORITY_ONLY_CONFIG, configPathItem, packageJson,
          facebookPluginId,
          'APP_ID', facebook.APP_ID);
        runReplaceCordovaAndPackagePluginVariable(PRIORITY_ONLY_CONFIG, configPathItem, packageJson,
          facebookPluginId,
          'APP_NAME', facebook.APP_NAME);
        // runReplaceCordovaAndroidString(PRIORITY_ONLY_CONFIG, configPathItem, 'fb_app_id', facebook.APP_ID);
        // runReplaceCordovaAndroidString(PRIORITY_ONLY_CONFIG, configPathItem, 'fb_app_name',
        //   facebook.APP_NAME);
      }

      if (config.firebase.google) {
        const googlePluginId = 'cordova-plugin-googleplus';
        const google = config.firebase.google;

        runReplaceCordovaAndPackagePluginVariable(PRIORITY_ONLY_CONFIG, configPathItem, packageJson,
          googlePluginId,
          'PLAY_SERVICES_VERSION', google.PLAY_SERVICES_VERSION);
        runReplaceCordovaAndPackagePluginVariable(PRIORITY_ONLY_CONFIG, configPathItem, packageJson,
          googlePluginId,
          'REVERSED_CLIENT_ID', google.REVERSED_CLIENT_ID);
        runReplaceCordovaAndPackagePluginVariable(PRIORITY_ONLY_CONFIG, configPathItem, packageJson,
          googlePluginId,
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
