const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: {
    background: './src/background/background.ts',
    sidepanel: './src/sidepanel/sidepanel.ts',
    popup: './src/popup/popup.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist/js'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/manifest.json', to: '../' },
        { from: 'src/sidepanel/sidepanel.html', to: '../' },
        { from: 'src/popup/popup.html', to: '../' },
        { from: 'src/styles', to: '../styles', noErrorOnMissing: true }
      ]
    })
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    hot: true,
    watchFiles: ['src/**/*'],
  }
}; 