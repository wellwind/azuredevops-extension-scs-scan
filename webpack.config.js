const path = require('path');

module.exports = {
  entry: './buildandreleasetask/index.ts',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'buildandreleasetask'),
  },
  target: 'node',
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: "tsconfig.json"
            }
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".js"]
  }
};