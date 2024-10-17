// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { InlineInput } from "./inlineInput";
import { printChannelOutput } from "../extension";
import { ActionContext } from "./action";

export interface RepeatInput extends RepeatExit {
  contextId: string;
  command: string;
  timeoutSeconds?: number;
}

export interface RepeatExit {
  contextId?: string;
  deactivateAll?: boolean;
}

let anyContextActive = false;

export function activateDotRepeat(context: vscode.ExtensionContext) {
  printChannelOutput("Dot Repeat activating");

  const activeContexts: Map<string, ActionContext> = new Map();
  const globalContextId = "da-global-context-active";

  function createContext(contextId: string, timeoutSeconds: number = 3) {
    // Create the context
    const newContext = new ActionContext(contextId, timeoutSeconds, deactivateContext);
    activeContexts.set(contextId, newContext);
    vscode.commands.executeCommand("setContext", globalContextId, true);
    return newContext;
  }

  function deactivateContext(contextId: string) {
    // Destroy the context
    const context = activeContexts.get(contextId);
    if (context) {
      context.destruct();
      activeContexts.delete(contextId);
    }
    // Check if any context is active and deactivate global context if not
    anyContextActive = false;
    activeContexts.forEach((value) => {
      if (value && value.IsActive()) {
        anyContextActive = true;
        return;
      }
    });
    if (!anyContextActive) {
      printChannelOutput(
        "  Deactivating global context (da-global-context-active)",
        true
      );
      vscode.commands.executeCommand(
        "setContext",
        "da-global-context-active",
        false
      );
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "double-action.repeatExecute",
      (input: RepeatInput) => {
        console.log("[double-action] RepeatExecute command executed", input);
        printChannelOutput("RepeatExecute command executed", true);
        if (input) {
          if (!input.contextId) {
            vscode.window.showErrorMessage(
              `Invalid contextId: ${input.contextId}`
            );
            return;
          } else if (input.contextId.length <= 1) {
            vscode.window.showErrorMessage(
              `Invalid contextId length: ${input.contextId} has to be at least 2 characters long`
            );
            return;
          }
          let context = activeContexts.get(input.contextId);
          if (!context) {
            context = createContext(input.contextId, input.timeoutSeconds);
          }
          context.activate(input.command);
        }
      }
    ),
    vscode.commands.registerCommand(
      "double-action.repeatExit",
      (input: RepeatExit) => {
        console.log("[double-action] RepeatExit command executed", input);
        if (input) {
          if (input.deactivateAll) {
            printChannelOutput("Deactivating all contexts", true);
            activeContexts.forEach((context) => {
              context.deactivate();
            });
          } else {
            if (!input.contextId) {
              vscode.window.showErrorMessage(
                `Invalid contextId: ${input.contextId}`
              );
              return;
            } else if (input.contextId.length <= 1) {
              vscode.window.showErrorMessage(
                `Invalid contextId length: ${input.contextId} has to be at least 2 characters long`
              );
              return;
            }
            const context = activeContexts.get(input.contextId);
            if (context) {
              context.deactivate();
            } else {
              printChannelOutput("Context not found", true);
            }
          }
        }
      }
    )
  );
  printChannelOutput("Dot Repeat activated", false);
}
