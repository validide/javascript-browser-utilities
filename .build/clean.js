const glob = require("glob");
const rimraf = require("rimraf");

const pathsToClean = [
  "./.nyc_output",
  "./coverage",
  "./dist",
  "./docs/dist"
];

for (let i = 0; i < pathsToClean.length; i++) {
  let matches = glob.sync(pathsToClean[i], []);
  for (let j = 0; j < matches.length; j++) {
    rimraf.sync(matches[j]);
  }
}

console.log("Done cleaning!");
