const _fs = require(`fs`);

const packageVersion = process.argv[0].trim();
const packageFileLocation = './package.json';
const packageFile = _fs.readFileSync(packageFileLocation);
const package = packageFile
  .toString()
  .replace(/("version":\s*)(".*")/ig, function (match, c1, c2, offset, str) {
    return `${c1}"${packageVersion}"`;
  });
 _fs.writeFileSync(packageFileLocation, Buffer.from(package));
console.log(`Patched '${packageFileLocation}' with version: '${packageVersion}'!`);
