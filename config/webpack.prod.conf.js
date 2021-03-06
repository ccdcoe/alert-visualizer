const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const base = require('./webpack.base.conf');

module.exports = merge(base, {
  mode   : 'production',
  // devtool : 'source-map', // remove this comment if you want JS source maps
  output : {
    path       : path.resolve(__dirname, '../dist'),
    publicPath : '/',
    filename   : '[chunkhash].app.js'
  },
  optimization: {
    minimizer: [
      new UglifyJsPlugin({
        cache     : true,
        parallel  : true,
        sourceMap : false // set to true if you want JS source maps
      }),
      new OptimizeCSSAssetsPlugin({
        cssProcessorOptions: {
          map: {
            inline     : false,
            annotation : true
          }
        }
      })
    ]
  },
  module: {
    rules: [{
      test : /(\.css|\.pcss)$/,
      use  : [
        {
          loader: MiniCssExtractPlugin.loader
        },
        {
          loader  : 'css-loader', // translates CSS into CommonJS
          options : {
            minimize      : true,
            sourceMap     : true,
            importLoaders : 2
          }
        },
        {
          loader  : 'postcss-loader', // postprocesses CSS
          options : {
            sourceMap : true,
            ident     : 'postcss'
          }
        },
        {
          // resolves relative paths based on the original source file.
          loader: 'resolve-url-loader'
        }
      ]
    }]
  },
  plugins: [
    new CleanWebpackPlugin(['dist'], { verbose: false }),
    new MiniCssExtractPlugin({
      filename: '[chunkhash].app.css'
    }),
    new HtmlWebpackPlugin({
      filename : path.resolve(__dirname, '../dist/index.html'),
      template : 'src/index.ejs',
      favicon  : 'favicon.ico', // or use favicons-webpack-plugin
      title    : 'Visualizer',
      minify   : {
        removeComments        : true,
        collapseWhitespace    : true,
        removeAttributeQuotes : true
      }
    }),
    // copy assets
    new CopyWebpackPlugin([
      {
        from   : path.resolve(__dirname, '../src/assets'),
        to     : 'assets',
        ignore : ['.*', 'styles/*', 'fonts/*']
      }
    ]),
    new webpack.DefinePlugin({
      PRODUCTION: JSON.stringify(true)
    })
  ]
});
