import * as vscode from "vscode";
import { execSync } from "child_process";
import * as fs from "fs";
import * as tmp from "tmp";
import parseDiff from "parse-diff";
import { printChannelOutput } from "../extension"; // Ensure this is correctly implemented
import deindent from "deindent"; // If not used, consider removing
import path from "path";
import { CustomEditorLabelService, ICustomEditorLabelPatterns } from '../helpers/customEditorLabelService';

export function activateGit(context: vscode.ExtensionContext) {
  console.log("Git extension activated.");

  const stageHunkDisposable = vscode.commands.registerCommand(
    "double-action.stageHunk",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found.");
        console.log("Error: No active editor found.");
        return;
      }
      if (editor.document.isDirty || editor.document.isUntitled) {
        vscode.window.showInformationMessage(
          "Save the file before staging a hunk."
        );
        console.log("Error: Save the file before staging a hunk.");
        return;
      }

      const position = editor.selection.active;
      const currentLine = position.line + 1; // Git diffs are 1-based
      const fileUri = editor.document.uri;
      const filePath = vscode.workspace.asRelativePath(fileUri, false);

      try {
        console.log(`\n--- Staging Hunk ---`);
        console.log(`Current Line: ${currentLine}`);
        console.log(`File Path: $src\git\main.ts`);
        printChannelOutput(
          `Staging hunk at line ${currentLine} in file $src\git\main.ts`
        );

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
        if (!workspaceFolder) {
          vscode.window.showErrorMessage("No workspace folder found.");
          console.log("Error: No workspace folder found.");
          return;
        }
        const cwd = workspaceFolder.uri.fsPath;
        printChannelOutput(`Workspace Folder: ${cwd}`);
        console.log(`Workspace Folder: ${cwd}`);

        // Fetch the diff with zero context lines
        console.log(`Executing: git diff --unified=0 -- "$src\git\main.ts"`);
        const diffOutput = execSync(`git diff --unified=0 -- "$src\git\main.ts"`, {
          cwd: cwd,
        }).toString();
        console.log(`Diff Output:\n${diffOutput}`);

        const parsedDiff = parseDiff(diffOutput);
        console.log("Parsed Diff:", JSON.stringify(parsedDiff, null, 2));

        if (parsedDiff.length === 0) {
          vscode.window.showErrorMessage("No changes found for this file.");
          console.log("Error: No changes found in the diff for this file.");
          return;
        }

        const fileDiff = parsedDiff.find(
          (d) => d.to === filePath || d.from === filePath
        );
        console.log("File Diff Found:", JSON.stringify(fileDiff, null, 2));

        if (!fileDiff) {
          vscode.window.showErrorMessage("No changes found for this file.");
          console.log("Error: No fileDiff found.");
          return;
        }

        const indexLine = `index ${fileDiff.index?.join(" ")}`;
        console.log(indexLine);

        // Find the hunk containing the current line
        const hunk = fileDiff.chunks.find((chunk) => {
          const hunkStart = chunk.newStart;
          const hunkEnd = chunk.newStart + chunk.newLines - 1;
          console.log(`Checking Hunk: Start=${hunkStart}, End=${hunkEnd}`);
          return currentLine >= hunkStart && currentLine <= hunkEnd;
        });

        if (!hunk) {
          vscode.window.showErrorMessage(
            "No hunk found at the current cursor position."
          );
          console.log("Error: No hunk found at the current cursor position.");
          return;
        }

        console.log("Hunk Found:", JSON.stringify(hunk, null, 2));

        // Extract hunk lines from hunk.changes
        const hunkLines = hunk.changes
          .map((change) => change.content)
          .join("\n");
        console.log("Hunk Lines Extracted:\n" + hunkLines);

        // Construct the full patch with file headers and the hunk
        //index ${oldHash}..${newHash} ${mode}
        const fullPatch =
          deindent`
              diff --git a/${fileDiff.to} b/${fileDiff.to}
              ${indexLine}
              --- a/${fileDiff.to}
              +++ b/${fileDiff.to}
              @@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@
              ${hunkLines}
          `.trim() + "\n";

        printChannelOutput(`Constructed Patch:\n${fullPatch}`);
        console.log("Constructed Patch:\n", fullPatch);

        // Write the full patch to a temporary file
        const tempPatch = tmp.fileSync({ postfix: ".patch" });
        try {
          fs.writeFileSync(tempPatch.name, fullPatch);
          console.log(`Patch written to temporary file: ${tempPatch.name}`);

          // Apply the patch to the Git index (stage the hunk)
          console.log(`Applying patch: git apply --cached "${tempPatch.name}"`);
          execSync(`git apply --cached --unidiff-zero "${tempPatch.name}"`, {
            cwd: cwd,
          });

          console.log("Patch applied successfully.");

          vscode.window.showInformationMessage("Hunk staged successfully.");
          printChannelOutput("Hunk staged successfully.");
        } catch (error: any) {
          vscode.window.showErrorMessage(`Error: ${error.message}`);
          console.error("Error Details:", error);
        } finally {
          // Clean up the temporary file
          tempPatch.removeCallback();
          console.log("Temporary patch file removed.");
        }
      } catch (error: Error | any) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
        console.error("Error Details:", error);
      }
    }
  );
  context.subscriptions.push(stageHunkDisposable);
  // console.log("\n\n\n\n");
  // console.log(vscode.workspace.getConfiguration("workbench").get("editor.customLabels"));
  // const customLabelsEnabled: boolean | undefined = vscode.workspace.getConfiguration("workbench").get("editor.customLabels.enabled");
  // const customLabelsPatterns: ICustomEditorLabelPatterns | undefined = vscode.workspace.getConfiguration("workbench").get("editor.customLabels.patterns");
  // console.log(customLabelsEnabled);
  // console.log(customLabelsPatterns);

  // // Create an instance of the service
  // if (customLabelsEnabled && customLabelsPatterns) {
  //   // console.log(labelService.getName("src/git/main.ts"));
  //   console.log(labelService.getName(vscode.window.activeTextEditor?.document.uri!));
  // }
}
function decoratorTest() {
  let beforeDecoration: vscode.ThemableDecorationAttachmentRenderOptions = {
    contentText: "HTML",
    backgroundColor: "#DA70D6AA",
    // border: `1px solid`,
    borderColor: "#DA70D6AA",

    color: "#ffffff",
    textDecoration:
      "none;position:absolute;z-index:999999;max-height:100%;left:-20px;",
  };
  const extPath = vscode.extensions.getExtension(
    "Logonz.double-action"
  )?.extensionPath;
  console.log(extPath);
  const gutterIconPath = vscode.Uri.file(
    path.join(__dirname, "icons", "html.svg")
  );

  console.log(gutterIconPath);
  const decorator = vscode.window.createTextEditorDecorationType({
    backgroundColor: "#ffd90055",
    // color: "#000000",
    // before: beforeDecoration,
    // // light: {
    // //   backgroundColor: pickColorType(light_matchBackground),
    // //   color: pickColorType(light_matchForeground),
    // //   before: {
    // //     backgroundColor: letterBackgroundLight,
    // //     borderColor: letterBackgroundLight,
    // //     color: pickColorType(light_letterForeground),
    // //   },
    // // },
    // overviewRulerColor: "#4169E1",
    // overviewRulerLane: 2, // vscode.OverviewRulerLane.Center
    // gutterIconPath: gutterIconPath,
    // gutterIconSize: "contain",
    // backgroundColor: "rgba(0, 255, 0, 0.3)",
    after: beforeDecoration,
    // overviewRulerLane: vscode.OverviewRulerLane.Right,
    // border: "1px solid blue",
    overviewRulerLane: vscode.OverviewRulerLane.Right
  });
  const gg = vscode.scm.createSourceControl("git", "Git");
  const editor = vscode.window.activeTextEditor;
  const decorationOptions: vscode.DecorationOptions[] = [];
  const range = new vscode.Range(
    new vscode.Position(5, 0),
    new vscode.Position(5, 1)
  ); // Line number 5
  decorationOptions.push({ range: range,renderOptions: { before: beforeDecoration } });
  editor?.setDecorations(decorator, decorationOptions);

}

// // Retrieve blob hashes and file mode
// const blobInfo = getBlobInfo(filePath, cwd);
// if (!blobInfo) {
//   vscode.window.showErrorMessage(
//     "Failed to retrieve blob information."
//   );
//   console.log("Error: Failed to retrieve blob information.");
//   return;
// }
// const { oldHash, newHash, mode } = blobInfo;
// console.log(
//   `Blob Info - Old Hash: ${oldHash}, New Hash: ${newHash}, Mode: ${mode}`
// );

// Helper function to get old and new blob hashes and file mode
function getBlobInfo(
  filePath: string,
  cwd: string
): { oldHash: string; newHash: string; mode: string } | null {
  try {
    console.log(`Retrieving blob info for file: ${filePath}`);
    // Get the old hash and mode from the index
    console.log(`Executing: git ls-files --stage "${filePath}"`);
    const lsFilesOutput = execSync(`git ls-files --stage "${filePath}"`, {
      cwd,
    })
      .toString()
      .trim();
    console.log(`ls-files Output: ${lsFilesOutput}`);
    const [mode, oldHash] = lsFilesOutput.split(/\s+/);
    console.log(`Parsed ls-files - Mode: ${mode}, Old Hash: ${oldHash}`);

    // Get the new hash from the working directory
    console.log(`Executing: git hash-object "${filePath}"`);
    const newHash = execSync(`git hash-object "${filePath}"`, { cwd })
      .toString()
      .trim();
    console.log(`New Hash: ${newHash}`);

    return { oldHash, newHash, mode };
  } catch (error: any) {
    console.error("Failed to retrieve blob info:", error);
    return null;
  }
}
