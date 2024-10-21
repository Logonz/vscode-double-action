import * as vscode from "vscode";
import * as fs from "fs";

export const importme = "";

if (process.env.NODE_ENV === "development") {
  console.log("Running in development mode");
  const distDir = process.env.DIST_DIR;
  if (distDir) {
    function debounce(func: Function) {
      let timeoutId: NodeJS.Timeout;
      return function () {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func();
        }, 2000);
      };
    }
    const refresh = debounce(() => {
      vscode.commands.executeCommand("workbench.action.reloadWindow");
    });
    console.log(`Watching ${process.env.DIST_DIR} for changes`);
    // Monitor the dist directory for changes and restart the extension
    fs.watch(distDir, (eventType, filename) => {
      console.log(`Detected change in ${filename}`);
      refresh();
    });
  }
}