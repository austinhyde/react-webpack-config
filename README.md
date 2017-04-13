# react-webpack-config
My own simple, ready-to-go Webpack configuration for React apps

# Basic Usage

*npm package coming soon*  
*Until I put up an official package, just clone this and `npm install <path to the clone>`*

Add to your `package.json`:

    "scripts": {
      "build": "node ./node_modules/react-webpack-config/webpack.js build",
      "start": "node ./node_modules/react-webpack-config/webpack.js serve"
    }

By default, this package generates an HTML template for you, and assumes your entrypoint is `src/index.js` relative to your `package.json`
