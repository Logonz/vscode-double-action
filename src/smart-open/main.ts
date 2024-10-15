// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { InitializeFind, SpawnQuickPick } from "./find";
import { printChannelOutput } from "../extension";


export function activateSmartOpen(context: vscode.ExtensionContext) {
  printChannelOutput("Smart Open activating");
  InitializeFind(context);

  let quickOpen = vscode.commands.registerCommand(
    "double-action.quickOpenFzy",
    async () => {
      await SpawnQuickPick();
    }
  );

  context.subscriptions.push(quickOpen);

  printChannelOutput("Smart Open activated", true);
}