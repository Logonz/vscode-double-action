// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { printChannelOutput } from "../extension";

export function activateDoubleAction(context: vscode.ExtensionContext) {
  printChannelOutput("Double Action activating");

  // TODO: Do we need to recreate this object to update the configuration?
  let config = vscode.workspace.getConfiguration("double-action");

  // Read the configuration settings
  let timeoutPress: boolean = config.get("timeoutPress") as boolean;
  let singlePressCommand: string = config.get("singlePressCommand") as string;
  let preDoublePressCommand = config.get("preDoublePressCommand") as string;
  let doublePressCommand: string = config.get("doublePressCommand") as string;
  let doublePressThreshold: number = config.get("doublePressThreshold") as number;
  let timeoutId: NodeJS.Timeout | null = null;
  let first = true;

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      console.log("Configuration changed");
      if (
        event.affectsConfiguration("double-action.timeoutPress") ||
        event.affectsConfiguration("double-action.singlePressCommand") ||
        event.affectsConfiguration("double-action.preDoublePressCommand") ||
        event.affectsConfiguration("double-action.doublePressCommand") ||
        event.affectsConfiguration("double-action.doublePressThreshold")
      ) {
        // TODO: Do we need to recreate this object to update the configuration?
        config = vscode.workspace.getConfiguration("double-action");
        timeoutPress = config.get("timeoutPress") as boolean;
        singlePressCommand = config.get("singlePressCommand") as string;
        preDoublePressCommand = config.get("preDoublePressCommand") as string;
        doublePressCommand = config.get("doublePressCommand") as string;
        doublePressThreshold = config.get("doublePressThreshold") as number;

        // Reset the timeoutId and first
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        first = true;
      }
    })
  );

  const disposable = vscode.commands.registerCommand(
    "double-action.execute",
    () => {
      if (!timeoutPress) {
        if (!first) {
          console.log("[Double-Action] Double press detected!");

          first = true;
          // This is used personally to exit the previous command
          if (preDoublePressCommand !== "") {
            vscode.commands.executeCommand(preDoublePressCommand);
          }
          vscode.commands.executeCommand(doublePressCommand);

          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        } else {
          console.log("[Double-Action] Single press");

          first = false;
          vscode.commands.executeCommand(singlePressCommand);
          timeoutId = setTimeout(() => {
            first = true;
          }, doublePressThreshold);
        }
      } else {
        if (timeoutId) {
          // Double press detected
          clearTimeout(timeoutId);
          timeoutId = null;
          console.log("[Double-Action] Double press detected!");
          // This is used personally to exit the previous command
          if (preDoublePressCommand !== "") {
            vscode.commands.executeCommand(preDoublePressCommand);
          }
          // Execute your double press command here
          vscode.commands.executeCommand(doublePressCommand);
        } else {
          timeoutId = setTimeout(() => {
            // Single press
            timeoutId = null;
            console.log("[Double-Action] Single press");
            // Execute your single press command here
            vscode.commands.executeCommand(singlePressCommand);
          }, doublePressThreshold);
        }
      }
    }
  );
  context.subscriptions.push(disposable);

  printChannelOutput("Double Action activated", false);
}
