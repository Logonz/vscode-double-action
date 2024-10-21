// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { InlineInput } from "./dot-repeat/inlineInput";
import { activateSmartOpen } from "./smart-open/main";
import { activateDotRepeat } from "./dot-repeat/main";
import { activateDoubleAction } from "./double-action/main";
import { activateJump } from "./jump/main";
import { activateGit } from "./git/main";

try {
 require("./debug");
} catch (e) {
  console.log("Error importing debug.ts");
}

let activateFunctions: {
  name: string;
  func: (context: vscode.ExtensionContext) => void;
}[] = [
  { name: "Double Action", func: activateDoubleAction },
  { name: "Dot Repeat", func: activateDotRepeat },
  { name: "Smart Open", func: activateSmartOpen },
  { name: "Jump", func: activateJump },
  { name: "Git", func: activateGit },
];
let deactivateFunctions: { name: string; func: () => void }[] = [
  { name: "Double Action", func: () => {} },
  { name: "Dot Repeat", func: () => {} },
  { name: "Smart Open", func: () => {} },
  { name: "Jump", func: () => {} },
  { name: "Git", func: () => {} },
];

let DAcontext: vscode.ExtensionContext;
export function getExtensionContext(): vscode.ExtensionContext {
  return DAcontext;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  DAcontext = context;
  outputChannel = vscode.window.createOutputChannel("Double Action");
  printChannelOutput("Started");

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "double-action" is now active!');

  // activateDoubleAction(context);

  // activateDotRepeat(context);

  // activateSmartOpen(context);

  // activateJump(context);

  // activateGit(context);

  activateFunctions.forEach((func) => {
    printChannelOutput(`---> Loading Module: ${func.name}`);
    console.log(`---> Loading Module: ${func.name}`);
    func.func(context);
  });
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
