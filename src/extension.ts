// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { InlineInput } from "./dot-repeat/inlineInput";
import { activateSmartOpen } from "./smart-open/main";
import { activateDotRepeat } from "./dot-repeat/main";

export let DAcontext: vscode.ExtensionContext;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  DAcontext = context;
  outputChannel = vscode.window.createOutputChannel("Double Action");
  printChannelOutput("Started");

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "double-action" is now active!');

  // Read the configuration settings
  let timeoutPress: boolean = vscode.workspace
    .getConfiguration("double-action")
    .get("timeoutPress") as boolean;

  let singlePressCommand: string = vscode.workspace
    .getConfiguration("double-action")
    .get("singlePressCommand") as string;

  let preDoublePressCommand = vscode.workspace
    .getConfiguration("double-action")
    .get("preDoublePressCommand") as string;

  let doublePressCommand: string = vscode.workspace
    .getConfiguration("double-action")
    .get("doublePressCommand") as string;

  let doublePressThreshold: number = vscode.workspace
    .getConfiguration("double-action")
    .get("doublePressThreshold") as number;

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
        timeoutPress = vscode.workspace
          .getConfiguration("double-action")
          .get("timeoutPress") as boolean;
        singlePressCommand = vscode.workspace
          .getConfiguration("double-action")
          .get("singlePressCommand") as string;
        preDoublePressCommand = vscode.workspace
          .getConfiguration("double-action")
          .get("preDoublePressCommand") as string;
        doublePressCommand = vscode.workspace
          .getConfiguration("double-action")
          .get("doublePressCommand") as string;
        doublePressThreshold = vscode.workspace
          .getConfiguration("double-action")
          .get("doublePressThreshold") as number;

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

  activateDotRepeat(context);

  activateSmartOpen(context);
}

// This method is called when your extension is deactivated
export function deactivate() {}

let outputChannel: vscode.OutputChannel;
/**
 * Prints the given content on the output channel.
 *
 * @param content The content to be printed.
 * @param reveal Whether the output channel should be revealed.
 */
export function printChannelOutput(content: string, reveal = false): void {
  outputChannel.appendLine(content);
  if (reveal) {
    outputChannel.show(true);
  }
}