const fs = require('fs');
const f = 'node_modules/@angular-devkit/build-angular/src/angular-cli-files/models/webpack-configs/browser.js';

console.log('webpack-config patching...');

fs.readFile(f, 'utf8', function(err, data) {
  if (err) {
    return console.log(err);
  }
  let result = data.replace(
    /node:[\s]*false/g,
    "node: {crypto: true, stream: true, http: true, https: true, os: true, vm: true, fs: 'empty', net: 'empty', child_process: 'empty'}"
  );

  fs.writeFile(f, result, 'utf8', function(err) {
    if (err) return console.log(err);
  });
});
