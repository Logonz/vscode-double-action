//@ts-check

"use strict";

const path = require("path");

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: "node", // VS Code extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
  mode: "none", // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

  entry: "./src/extension.ts", // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
  },
  externals: {
    vscode: "commonjs vscode", // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    // modules added here also need to be added in the .vscodeignore file
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
          },
        ],
      },
    ],
  },
  devtool: "nosources-source-map",
  infrastructureLogging: {
    level: "log", // enables logging required for problem matchers
  },
  plugins: [
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap("AfterEmitPlugin", (compilation) => {
          console.log("Compilation finished");
          // If env "watch" is set, copy the files
          if (process.env.NODE_ENV?.includes("watch=true")) {
            console.log("In watch mode, Copying files");
            // Copy the package.json file and the dist folder to the extension folder
            // %userprofile%\.vscode\extensions\logonz.double-action-1.0.2
            // Get version from package.json
            const version = require("./package.json").version;
            // Get home directory
            const homedir = require("os").homedir();
            // Copy package.json to dist folder
            const fs = require("fs");
            fs.copyFileSync(
              "package.json",
              path.join(
                homedir,
                `.vscode\\extensions\\logonz.double-action-${version}\\package.json`
              )
            );
            // Copy dist folder to extension folder
            // Get all files in dist folder
            const files = fs.readdirSync("dist");
            // Copy each file to extension folder
            for (const file of files) {
              fs.copyFileSync(
                `dist/${file}`,
                path.join(
                  homedir,
                  `.vscode\\extensions\\logonz.double-action-${version}\\dist\\${file}`
                )
              );
            }
          } else {
            console.log("Not in watch mode, skipping copy");
            return;
          }
        });
      },
    },
  ],
};
module.exports = [extensionConfig];
