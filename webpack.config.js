// Borrowed from https://github.com/krasimir/webpack-library-starter/blob/master/webpack.config.js

const webpack = require('webpack');

const UglifyJsPlugin = webpack.optimize.UglifyJsPlugin;
const path = require('path');
const env = require('yargs').argv.env; // use --env with webpack 2

const libraryName = 'diag-app';

const plugins = [];
let outputFile;

if (env === 'build') {
  plugins.push(new UglifyJsPlugin({ sourceMap: true, keep_fnames: true, minimize: true }));
  outputFile = `${libraryName}.min.js`;
} else {
  outputFile = `${libraryName}.js`;
}

const config = {
  entry: `${__dirname}/src/js/index.js`,
  devtool: 'source-map',
  node: { process: false },
  output: {
    path: `${__dirname}/lib`,
    filename: outputFile,
    library: libraryName,
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    rules: [
      {
        test: /(\.jsx|\.js)$/,
        loader: 'babel-loader',
        exclude: /(node_modules|bower_components)/
      },
      {
        test: /(\.jsx|\.js)$/,
        loader: 'eslint-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    modules: [path.resolve('./node_modules'), path.resolve('./src')],
    extensions: ['.json', '.js']
  },
  plugins,
};

module.exports = config;
