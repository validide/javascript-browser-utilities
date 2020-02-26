const _fs = require(`fs`);
const args = process.argv.slice(2);

const packageVersion = args[0].trim().replace(/^v\./gi, '').replace(/^v/gi, '');
const packageFileLocation = './package.json';
const packageFile = _fs.readFileSync(packageFileLocation);
const package = packageFile
  .toString()
  .replace(/("version":\s*)(".*")/ig, function (match, c1, c2, offset, str) {
    return `${c1}"${packageVersion}"`;
  });
 _fs.writeFileSync(packageFileLocation, Buffer.from(package));
console.log(`Patched '${packageFileLocation}' with version: '${packageVersion}'!`);
