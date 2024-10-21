// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { InitializeFind, SpawnQuickPick } from "./find";
import { printChannelOutput } from "../extension";
import { updateCustomLabelConfiguration } from "../helpers/customEditorLabelService";

export function activateSmartOpen(context: vscode.ExtensionContext) {
  printChannelOutput("Smart Oopen activating");
  InitializeFind(context);

  context.subscriptions.push(
    vscode.commands.registerCommand("double-action.SmartOpen", async () => {
      await SpawnQuickPick();
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration("workbench.editor.customLabels.enabled") ||
        event.affectsConfiguration("workbench.editor.customLabels.patterns")
      ) {
        updateCustomLabelConfiguration();
      }
    })
  );

  printChannelOutput("Smart Open activated", false);
}
