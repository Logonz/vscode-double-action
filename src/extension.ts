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