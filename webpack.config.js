const path = require("path");
const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const browser = process.env.BROWSER_TARGET || "chrome";

module.exports = {
  devtool: "source-map",
  entry: {
    background: "./src/background",
    content: "./src/content",
    styles: "./static/styles/main.scss",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          {
            loader: "sass-loader",
            options: {
              sourceMap: true,
            }
          }
        ]
      }
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".scss", ".css"],
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, `dist/${browser}`),
  },
  watch: true,
  plugins: [
    new webpack.DefinePlugin({
      "process.env.BROWSER_TARGET": JSON.stringify(browser),
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: `./manifest.${browser}.json`, to: "manifest.json" },
        { from: "static/assets", to: "assets" },
        { from: "static/templates", to: "templates" },
      ],
    }),
    new MiniCssExtractPlugin({
      filename: "styles/styles.css",
    })
  ],
};
