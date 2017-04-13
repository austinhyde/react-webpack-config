const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const HtmlPlugin = require('html-webpack-plugin');

const rr = require.resolve.bind(require);
const PROD = process.env.NODE_ENV === 'production';
const MODE = process.argv[2];

const configFile = path.resolve('build.config.js');
const buildConfig = fs.existsSync(configFile) ? require(configFile) : {};

const SERVE_HOST = buildConfig.serveHost || 'localhost';
const SERVE_PORT = buildConfig.servePort || 3000;
const SERVE_PUB_HOST = buildConfig.servePubHost || SERVE_HOST;
const SERVE_PUB_PORT = buildConfig.servePubPort || SERVE_PORT;
const SERVE_PUB_URL = `http://${SERVE_PUB_HOST}:${SERVE_PUB_PORT}/`;

const USE_POLYFILL = 'polyfill' in buildConfig ? buildConfig.polyfill : false;

var config = {
  debug: true,
  target: 'web',
  devtool: 'source-map',
  entry: [path.resolve('src/index.js')],
  output: {
    path: path.resolve('build/'),
    filename: '[name].[hash].js',
    chunkFilename: '[id].[chunkhash].js',
  },
  module: {
    loaders: [
      { test: /\.js$/,
        loader: rr('babel-loader'),
        exclude: /node_modules/,
        query: {
          presets: [
            rr('babel-preset-es2015'),
            rr('babel-preset-es2016'),
            rr('babel-preset-es2017'),
            rr('babel-preset-react')
          ],
          plugins: [
            rr('babel-plugin-transform-function-bind'),
            rr('babel-plugin-transform-export-extensions'),
            rr('babel-plugin-transform-object-rest-spread'),
            rr('babel-plugin-transform-class-properties'),
          ]
        },
      },
      { test: /\.css$/, loaders: 'style!css' },
      { test: /\.scss$/, loader: 'style!css!scss' },
      { test: /\.eot(\?v=.*)?$/, loader: 'file?name=[name].[hash].[ext]' },
      { test: /\.(ico|png|gif|jpe?g)$/i, loader: 'file?name=[name].[hash].[ext]' },
      { test: /\.woff2?(\?v=.*)?$/, loader: 'url?prefix=font/&limit=5000&name=' },
      { test: /\.ttf(\?v=.*)?$/, loader: 'url?limit=10000&mimetype=application/octet-stream&name=[name].[hash].[ext]' },
      { test: /\.svg(\?v=.*)?$/, loader: 'url?limit=10000&mimetype=image/svg+xml&name=[name].[hash].[ext]' },
      { test: /\.json$/, loader: 'json' }
    ],
    noParse: [/\.min\.js/]
  },
  resolve: {
    extensions: ['', '.js', '.jsx'],
    root: path.resolve('./node_modules')
  },
  resolveLoader: { root: path.join(__dirname, "node_modules") },
  plugins: [
    new HtmlPlugin({
      template: rr('./template.html')
    }),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.DefinePlugin({
      NODE_ENV: JSON.stringify(process.env.NODE_ENV),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    }),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery',
      fetch: 'imports?this=>global!exports?global.fetch!whatwg-fetch'
    }),
  ]
};

if (USE_POLYFILL) {
  config.entry.unshift(rr('babel-polyfill'));
}


if (PROD) {
  config.bail = true;
  config.plugins.push(new webpack.optimize.DedupePlugin());
  config.plugins.push(new webpack.optimize.UglifyJsPlugin({
    compress: { warnings: false }
  }));
}

if (MODE === 'serve') {
  config.devtool = 'source-map';
  config.output.publicPath = SERVE_PUB_URL;

  // enable hot reloading
  config.plugins.unshift(new webpack.HotModuleReplacementPlugin());
  config.entry.unshift(rr('webpack/hot/only-dev-server'));
  config.entry.unshift(rr('webpack-hot-middleware/client')+`?path=${SERVE_PUB_URL}__webpack_hmr`);
  config.entry.unshift(rr('react-hot-loader/patch'));
}

if (buildConfig.postprocess) {
  config = buildConfig.postprocess(config) || config;
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
      console.log(stats.toString({ children: false, chunks: true, reasons: false, colors: true }));
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
    app.listen(SERVE_PORT, SERVE_HOST, err => {
      if (err) {
        console.error(err.stack || err);
        if (err.details) console.error(err.details);
        return;
      }
      console.log(`Listening on ${SERVE_HOST}:${SERVE_PORT}`);
      console.log(`Serving at ${SERVE_PUB_URL}`);
      console.log('Building webpack bundle...');
    });
    break;
}
