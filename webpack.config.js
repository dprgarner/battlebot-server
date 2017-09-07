var os = require('os');
var path = require('path');

var _ = require('underscore');
var CopyWebpackPlugin = require('copy-webpack-plugin');
var webpack = require('webpack');

module.exports = {
  entry: {
    app: ['./client'],
  },

  output: {
    path: path.resolve(__dirname, 'build-client'),
    publicPath: '/',
    filename: 'bundle.js',
  },

  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['env']
          }
        }
      },
    ],
  },

  plugins: [
    new webpack.ProvidePlugin({
      React: 'react',
    }),

    new CopyWebpackPlugin([
      { from: './static/*', to: '[name].[ext]' },
    ]),
  ],

  resolve: {
    extensions: ['.js', '.jsx'],
  },

  devtool: 'source-map',
};
