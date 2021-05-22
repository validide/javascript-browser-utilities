// eslint-disable-next-line no-undef
module.exports = {
  input: './dist/js/index.js',
  context: 'window',
  output: {
    dir: './dist/bundle/',
    format: 'umd',
    name: 'validide_jbu',
    sourcemap: true
  }
};
