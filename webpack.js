#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const HtmlPlugin = require('html-webpack-plugin');
const HtmlHddPlugin = require('html-webpack-harddisk-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const cssExtractPlugin = new ExtractTextPlugin('[name].[chunkhash].css');

const rr = require.resolve.bind(require);
const pr = path.resolve.bind(path);
const PROD = process.env.NODE_ENV === 'production';
const MODE = process.argv[2];

const packageJson = require(pr('package.json'));

const configFile = pr('build.config.js');
const settings = Object.assign({
  serveHost: 'localhost',
  servePort: 3000,
  servePubHost: 'localhost',
  servePubPort: 3000,
  globals: {},
  entrypoint: 'src/index.js',
  publicPath: '/static/',
  outputDir: 'static/',
  polyfill: false,
  indexHtml: true,
  htmlTitle: packageJson.name || 'App',
  postprocess: x => x,
}, fs.existsSync(configFile) ? require(configFile) : {});

const SERVE_PUB_URL = `http://${settings.servePubHost}:${settings.servePubPort}/`;
const ENTRYPOINT_FILE = pr(settings.entrypoint);
const ENTRYPOINT_DIR = path.dirname(ENTRYPOINT_FILE);

var config = {
  target: 'web',
  devtool: 'source-map',
  context: ENTRYPOINT_DIR,
  entry: [ENTRYPOINT_FILE],
  output: {
    path: pr(settings.outputDir),
    filename: '[name].[hash].js',
    chunkFilename: '[id].[chunkhash].js',
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [ 'es2015', 'es2016', 'es2017', 'react' ],
              plugins: [
                'transform-function-bind',
                'transform-export-extensions',
                'transform-object-rest-spread',
                'transform-class-properties',
              ]
            }
          }
        ]
      },
      { test: /\.css$/,
        use: PROD
          ? cssExtractPlugin.extract({fallback:'style-loader', use:'css-loader'})
          : ['style-loader','css-loader'] },
      { test: /\.s[ca]ss$/,
        use: PROD
          ? cssExtractPlugin({fallback:'style-loader', use:['css-loader','sass-loader']})
          : ['style-loader','css-loader','sass-loader'] },
      { test: /\.eot(\?v=.*)?$/, use: [{loader: 'file-loader', options: {name: '[name].[hash].[ext]'}}] },
      { test: /\.(ico|png|gif|jpe?g)$/i, use: [{loader: 'file-loader', options: {name: '[name].[hash].[ext]'}}] },
      { test: /\.woff2?(\?v=.*)?$/, use: [{loader: 'url-loader', options: {prefix: 'font/', limit: 5000,name: '[name].[hash].[ext]'}}] },
      { test: /\.ttf(\?v=.*)?$/, use: [{loader: 'url-loader', options: {mimetype: 'application/octet-stream', limit: 10000, name: '[name].[hash].[ext]'}}] },
      { test: /\.svg(\?v=.*)?$/, use: [{loader: 'url-loader', options: {mimetype: 'image/svg+xml', limit: 10000, name: '[name].[hash].[ext]'}}] },
    ],
    noParse: [/\.min\.js/]
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  plugins: [
    new webpack.DefinePlugin({
      NODE_ENV: JSON.stringify(process.env.NODE_ENV),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    }),
  ]
};

if (settings.polyfill) {
  config.entry.unshift('babel-polyfill');
}

if (settings.indexHtml) {
  config.plugins.unshift(new HtmlHddPlugin());
  config.plugins.unshift(new HtmlPlugin({
    alwaysWriteToDisk: true,
    template: settings.indexHtml === true ? rr('./template.html') : pr(settings.indexHtml),
    title: settings.htmlTitle,
  }));
}


if (PROD) {
  config.bail = true;
  config.plugins.unshift(cssExtractPlugin);
  config.plugins.push(new webpack.optimize.UglifyJsPlugin({
    sourceMap: true,
    output: {comments: false},
  }));
}

if (MODE === 'serve') {
  config.devtool = 'source-map';
  config.output.publicPath = SERVE_PUB_URL;

  // enable hot reloading
  config.plugins.unshift(new webpack.HotModuleReplacementPlugin());
  config.entry.unshift(rr('webpack/hot/only-dev-server'));
  config.entry.unshift(rr('webpack-hot-middleware/client')+`?path=${SERVE_PUB_URL}__webpack_hmr&reload=true`);
  try {
    config.entry.unshift(rr('react-hot-loader/patch'));
  } catch (e) {
    console.warn("Did not add react-hot-loader/patch to the entrypoint");
  }
}

if (settings.postprocess) {
  config = settings.postprocess(config) || config;
}

const compiler = webpack(config);

switch (MODE) {
  case 'build':
    compiler.run((err, stats) => {
      if (err) {
        console.error(err.stack || err);
        if (err.details) console.error(err.details);
        return;
      }
      console.log(stats.toString({
        children: false,
        chunks: true,
        reasons: false,
        colors: true,
        errorDetails: true,
        maxModules: Infinity
      }));
    });
    break;

  case 'serve':
    const app = require('express')();
    app.use(require('webpack-dev-middleware')(compiler, {
      noInfo: true,
      publicPath: '/',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'X-Requested-With',
      }
    }));
    app.use(require('webpack-hot-middleware')(compiler));
    app.listen(settings.servePort, settings.serveHost, err => {
      if (err) {
        console.error(err.stack || err);
        if (err.details) console.error(err.details);
        return;
      }
      console.log(`Listening on ${settings.serveHost}:${settings.servePort}`);
      console.log(`Serving at ${SERVE_PUB_URL}`);
      console.log('Building webpack bundle...');
    });
    break;
}
