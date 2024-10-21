import * as vscode from "vscode";

export function activateJump(context: vscode.ExtensionContext) {
  console.log("Jump activated");

  // Get the current visible text editors from all groups
  // let visibleTextEditors = vscode.window.visibleTextEditors;
  // console.log("Visible text editors:", visibleTextEditors);

  // for (let editor of visibleTextEditors) {
  //   console.log("Editor:", editor);
  //   console.log(editor.visibleRanges);z
  //   console.log(editor.document.getText(editor.visibleRanges[0]));
  //   console.log("hej");
  // }
}
