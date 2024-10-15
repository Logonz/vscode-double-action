// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { InlineInput } from "./inlineInput";
import { printChannelOutput } from "../extension";

interface RepeatInput extends RepeatExit {
  command: string;
  contextString: string;
  repeat?: boolean;
}

interface RepeatExit {
  contextString: string;
}

export function activateDotRepeat(context: vscode.ExtensionContext) {
  printChannelOutput("Dot Repeat activating");
  let inlineInput: InlineInput;
  let isActive = false;
  let userInput: string = "";
  function onInput(input: string) {
    userInput = input;
    console.log("[double-action] User input: ", userInput);
  }
  function onCancel() {
    console.log("[double-action] User input cancelled", userInput);
    isActive = false;
    userInput = "";
    inlineInput.destroy();
    vscode.commands.executeCommand("setContext", "doubleAction", false);
  }

  let statusBarItem: vscode.StatusBarItem;
  vscode.commands.executeCommand("setContext", "da-dot-repeat", false);

  let repeatTimeoutId: NodeJS.Timeout | null = null;
  let repeatTimeoutSecondIds: NodeJS.Timeout[] = [];
  let seconds = 3;

  const contexts: Map<string, boolean> = new Map();

  function repeatTimeout(context: string) {
    if (repeatTimeoutId) {
      clearTimeout(repeatTimeoutId);
      for (let i = 0; i < repeatTimeoutSecondIds.length; i++) {
        clearTimeout(repeatTimeoutSecondIds[i]);
      }
    }
    for (let i = 0; i < seconds; i++) {
      repeatTimeoutSecondIds.push(
        setTimeout(() => {
          if (statusBarItem) {
            statusBarItem.text = `░ dot-repeat ░ ${seconds - i}`;
          }
        }, i * (1000 - 5)) // -5 to make sure it's not over the total seconds
      );
    }
    repeatTimeoutId = setTimeout(() => {
      vscode.commands.executeCommand("setContext", context, false);
      contexts.set(context, false);
      if (statusBarItem) {
        statusBarItem.dispose();
      }
    }, seconds * 1000);
  }

  const repeatExecute = vscode.commands.registerCommand(
    "double-action.repeatExecute",
    (input: RepeatInput) => {
      console.log("[double-action] RRepeatExecute command executed", input);
      if (input) {
        if (!input.contextString) {
          vscode.window.showErrorMessage(
            `Invalid contextString: ${input.contextString}`
          );
          return;
        } else if (input.contextString.length <= 1) {
          vscode.window.showErrorMessage(
            `Invalid contextString length: ${input.contextString} has to be at least 2 characters long`
          );
          return;
        }
        if (input.repeat) {
          console.log("[double-action] RepeatExecute command executed", input);
          vscode.commands.executeCommand(input.command);
          repeatTimeout(input.contextString);
          return;
        } else {
          statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            1000
          );
          statusBarItem.text = `░ dot-repeat ░`;
          statusBarItem.show();
          console.log(
            "[double-action] RepeatExecute command executed first time",
            input
          );
          vscode.commands.executeCommand(input.command);
          repeatTimeout(input.contextString);
        }
        vscode.commands.executeCommand("setContext", input.contextString, true);
      }

      // if (isActive) {
      //   onCancel();
      //   isActive = false;
      //   return;
      // }
      // const textEditor = vscode.window.activeTextEditor;
      // if (!textEditor) {
      //   return;
      // }
      // vscode.window.showTextDocument(textEditor.document);

      // isActive = true;
      // vscode.commands.executeCommand("setContext", "doubleAction", true);
      // inlineInput = new InlineInput({
      //   textEditor,
      //   onInput: onInput,
      //   onCancel: onCancel,
      // });
    }
  );
  context.subscriptions.push(repeatExecute);
  const repeatExit = vscode.commands.registerCommand(
    "double-action.repeatExit",
    (input: RepeatExit) => {
      console.log("[double-action] RepeatExit command executed", input);
      if (input) {
        if (!input.contextString) {
          vscode.window.showErrorMessage(
            `Invalid contextString: ${input.contextString}`
          );
          return;
        } else if (input.contextString.length <= 1) {
          vscode.window.showErrorMessage(
            `Invalid contextString length: ${input.contextString} has to be at least 2 characters long`
          );
          return;
        }
        vscode.commands.executeCommand(
          "setContext",
          input.contextString,
          false
        );
        contexts.set(input.contextString, false);
        if (statusBarItem) {
          statusBarItem.dispose();
        }
      }
    }
  );
  context.subscriptions.push(repeatExit);

  printChannelOutput("Dot Repeat activated", true);
}
