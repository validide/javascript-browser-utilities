const _fs = require('fs');
const _path = require('path');
const _glob = require('glob');
const _uglifyJS = require("uglify-js");


function writeMinifiedFileSync(path, content, encding) {
  const file = _path.parse(path);
  const minifiedFilePath = _path.join(file.dir, `${file.name}.min${file.ext}`);
  _fs.writeFileSync(minifiedFilePath, content, encding);
}


_glob
  .sync('./dist/js/**/*.js', [])
  .forEach(f => {
    writeMinifiedFileSync(f, _uglifyJS.minify(_fs.readFileSync(f, 'utf8'), {}).code, 'utf8');
    console.log(`Minified "${f}"`);
  });
