// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import { hasMatch, score } from "./fzy";
import path from "path";
import fs from "fs";
import ignore from "ignore";

import { GetIconForFile, LoadIcons } from "./icons";
import { DAcontext, printChannelOutput } from "../extension";
import {
  MAX_FREQUENCY_SCORE,
  calculateCompositeScore,
  calculateRecencyScore,
  getFileMetadata,
  updateFileMetadata,
} from "./smart-open";

// Own interface extending QuickPickItem
export interface FileQuickPickItem extends vscode.QuickPickItem {
  filePath: string;
  relativePath: string;
  rawScore: number;
  recencyScore: number;
  frequencyScore: number;
  closeScore: number;
  finalScore: number;
}

const filesToIcon = new Map<string, vscode.Uri>();
// All files in the workspace
let files: string[] = [];

function getAllFileIcons(files: vscode.Uri[]) {
  printChannelOutput(`Getting all file icons`, true);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // GetIconForFile(vscode.Uri.file(file)).then((icon) => {
    GetIconForFile(file).then((icon) => {
      // const icon = iconDefinitions.get(ext) || vscode.ThemeIcon.File;
      // printChannelOutput(`Icon: ${icon}`, true);
      if (icon) {
        filesToIcon.set(file.fsPath, icon);
      }
    });
  }
}

function initalizeListener(context: vscode.ExtensionContext) {
  // File watchers
  const watcher = vscode.workspace.createFileSystemWatcher(
    "**/*",
    false,
    false,
    false
  );

  // TODO: Make these just scan the current file and not all files
  const debouncedOnDidCreate = debounce(async (uri: vscode.Uri) => {
    printChannelOutput(`On File Create : URI: ${uri}`);
    files = await GetAllFilesInWorkspace();
    getAllFileIcons(files.map((file) => vscode.Uri.file(file)));
  }, debounceDelay);

  // TODO: Make these just scan the current file and not all files
  // const debouncedOnDidChange = debounce(async (uri: vscode.Uri) => {
  //   printChannelOutput(`On File Change : URI: ${uri}`);
  //   getAllFileIcons(
  //     (await GetAllFilesInWorkspace()).map((file) => vscode.Uri.file(file))
  //   );
  // }, debounceDelay);

  // TODO: Make these just scan the current file and not all files
  const createD = watcher.onDidCreate(debouncedOnDidCreate);
  // watcher.onDidChange(debouncedOnDidChange);
  const deleteD = watcher.onDidDelete((uri) => {
    printChannelOutput(`On File Delete : URI: ${uri}`);
    filesToIcon.delete(uri.fsPath);
  });

  context.subscriptions.push(createD);
  context.subscriptions.push(deleteD);
}

const quickPickObject = vscode.window.createQuickPick<FileQuickPickItem>();

export async function InitializeFind(context: vscode.ExtensionContext) {
  // * Load Icon pack
  LoadIcons();

  files = await GetAllFilesInWorkspace();
  // * Get all files in the workspace
  getAllFileIcons(files.map((file) => vscode.Uri.file(file)));

  // * Initialize the listener
  initalizeListener(context);

  // * Intialize the quick pick
  quickPickObject.placeholder = "Type to search files...";
  quickPickObject.matchOnDescription = false;
  quickPickObject.matchOnDetail = false;
  // quickPickObject.items = filteredItems;

  // * Update items as the user types
  const changeD = quickPickObject.onDidChangeValue(async (value) => {
    const scores = await GenerateItemList(value, files);

    quickPickObject.items = scores;
  });

  // * User accepts the selection
  const acceptD = quickPickObject.onDidAccept(async () => {
    const selectedItem = quickPickObject.selectedItems[0];
    // Disabled is used to show the message to use at least 2 characters
    if (selectedItem && selectedItem.relativePath !== "disabled") {
      const filePath = vscode.Uri.file(selectedItem.filePath);
      vscode.window.showTextDocument(filePath);

      // Update metadata
      await updateFileMetadata(DAcontext, selectedItem.filePath);
    }
    quickPickObject.hide();
  });

  // * User hides the quick pick
  const hideD = quickPickObject.onDidHide(() => {
    // Reset the value
    quickPickObject.value = "";
  });

  context.subscriptions.push(changeD);
  context.subscriptions.push(acceptD);
  context.subscriptions.push(hideD);
}

export async function SpawnQuickPick() {
  quickPickObject.items = await GenerateItemList("", files);
  // Show the quick pick
  quickPickObject.show();
}

// Map a number from one range to another
/**
 * Maps a number from one range to another.
 * @param r1l - The lower bound of the first range.
 * @param r1h - The upper bound of the first range.
 * @param r2l - The lower bound of the second range.
 * @param r2h - The upper bound of the second range.
 * @param num - The number to be mapped from the first range to the second range.
 * @returns The number mapped from the first range to the second range.
 */
function mapNumberRange(
  r1l: number,
  r1h: number,
  r2l: number,
  r2h: number,
  num: number
) {
  return r2l + ((num - r1l) * (r2h - r2l)) / (r1h - r1l);
}

async function GenerateItemList(
  needle: string,
  files: string[]
): Promise<FileQuickPickItem[]> {
  // Due to the bug that is sorting in quick pick, it basically only works either with 0 or 2 characters
  // TODO: When the bug is fixed and we can do our own sorting, we can remove this (https://github.com/microsoft/vscode/issues/73904)
  if (needle.length == 1) {
    return [
      {
        label: "Use at least 2 characters to search files...",
        description: "",
        filePath: "",
        relativePath: "disabled",
        iconPath: new vscode.ThemeIcon("search"),
        rawScore: 0,
        recencyScore: 0,
        frequencyScore: 0,
        closeScore: 0,
        finalScore: 0,
      },
    ];
  }

  const metadata = getFileMetadata(DAcontext);
  const currentTime = Date.now();

  const currentActiveEditor = vscode.window.activeTextEditor;

  // Remove current file from the list
  files = files.filter(
    (file) => file !== currentActiveEditor?.document.uri.fsPath
  );

  const activeEditorPathParts = vscode.workspace
    .asRelativePath(currentActiveEditor?.document.uri.fsPath || "")
    .split("/");
  console.log(activeEditorPathParts);
  printChannelOutput(
    `Number of parts of active: ${activeEditorPathParts?.length}`,
    true
  );

  // First, compute the scores for all files
  const fileScores = files.map((file): FileQuickPickItem => {
    const relativePath = vscode.workspace.asRelativePath(file);
    const rawScore = score(needle, relativePath);

    const fileMeta = metadata[file];
    const lastOpened = fileMeta ? fileMeta.lastOpened : 0;
    const openCount = fileMeta ? fileMeta.openCount : 0;

    // Calculate the close score based on path overlap with the active editor
    let closeScore = 0;
    const fileParts = relativePath.split("/");
    const commonParts = fileParts.filter((part) =>
      activeEditorPathParts.includes(part)
    );
    const uncommonParts = fileParts.filter(
      (part) => !activeEditorPathParts.includes(part)
    );
    

    // TODO: Should we subtract the common parts from the total parts?
    closeScore = Math.max(0, commonParts.length - uncommonParts.length);
    return {
      label: "",
      filePath: file,
      relativePath: relativePath,
      rawScore: rawScore,
      recencyScore: Math.round(calculateRecencyScore(lastOpened, currentTime)),
      frequencyScore: openCount,
      closeScore: closeScore,
      finalScore: 0,
    };
  });
  const minScore = Math.min(
    ...fileScores.map((fs) =>
      fs.rawScore === Number.NEGATIVE_INFINITY ? 0 : fs.rawScore
    )
  );
  const maxScore = Math.max(
    ...fileScores.map((fs) =>
      fs.rawScore === Number.POSITIVE_INFINITY ? 0 : fs.rawScore
    )
  );
  const minRecencyScore = Math.min(...fileScores.map((fs) => fs.recencyScore));
  const maxRecencyScore = Math.max(...fileScores.map((fs) => fs.recencyScore));

  // const maxScoreValue = Math.round(maxScore - minScore);
  // const minLength = Math.ceil(Math.log(maxScoreValue + 1) / Math.log(base));

  // printChannelOutput(`Min score:, ${minScore}`, true);
  // printChannelOutput(`Max score:, ${maxScore}`, true);
  // printChannelOutput(`Max score value:, ${maxScoreValue}`, true);
  // printChannelOutput(`Min length:, ${minLength}`, true);

  const scoreWeights = {
    matchQuality: 0.5,
    recency: 0.3,
    frequency: 0.2,
    close: 0.1,
  };
  const filteredItems = (
    await Promise.all(
      fileScores
        .filter((fs) => hasMatch(needle, fs.relativePath))
        .map(async (fs): Promise<FileQuickPickItem> => {
          // Get the icon for the file type
          // const normalizedScore = Math.round(fs.rawScore - minScore);
          // console.log("FS1:", fs, normalizedScore);
          // const encodedScore = encodeScore(
          //   normalizedScore,
          //   // Math.max(minLength, 4)
          //   minLength
          // );
          // console.log("ICON1", filesToIcon.get(fs.filePath), fs.filePath);
          // console.log("ENC:", encodedScore);
          const fileMeta = metadata[fs.filePath];
          // const lastOpened = fileMeta ? fileMeta.lastOpened : 0;
          const openCount = fileMeta ? fileMeta.openCount : 0;

          console.log(fs);

          const recencyScoreMapped = mapNumberRange(
            minRecencyScore,
            maxRecencyScore,
            minScore,
            maxScore == 0 ? 100 : maxScore, // If nothing is matched we still want score for recency
            fs.recencyScore
          );
          const frequencyScoreMapped = mapNumberRange(
            0,
            MAX_FREQUENCY_SCORE,
            minScore,
            maxScore == 0 ? MAX_FREQUENCY_SCORE : maxScore, // If nothing is matched we still want score for frequency
            openCount
          );
          const closeScoreMapped = mapNumberRange(
            0,
            activeEditorPathParts.length,
            minScore,
            maxScore == 0 ? 100 : maxScore, // If nothing is matched we still want score for closeness
            fs.closeScore
          );
          const finalScore = calculateCompositeScore(
            fs.rawScore,
            recencyScoreMapped,
            frequencyScoreMapped,
            closeScoreMapped,
            scoreWeights
          );
          // printChannelOutput(`File: ${fs.relativePath}`, true);
          // printChannelOutput(`Open count: ${openCount}`, true);
          // printChannelOutput(`Recency Mapped: ${recencyScoreMapped}`, true);
          // printChannelOutput(`Frequency Mapped: ${frequencyScoreMapped}`, true);
          // printChannelOutput(`Final Score: ${finalScore}`, true);

          let descriptions: string[] = []
          descriptions.push(`${fs.relativePath} - (fnl:${finalScore.toFixed(2)})=`)
          descriptions.push(`(raw:${(fs.rawScore * scoreWeights.matchQuality).toFixed(2)})`)
          descriptions.push(`(rec:${(recencyScoreMapped * scoreWeights.recency).toFixed(2)})`)
          descriptions.push(`(frq:${(frequencyScoreMapped * scoreWeights.frequency).toFixed(2)})`)
          descriptions.push(`(cls:${(closeScoreMapped * scoreWeights.close).toFixed(2)})`)

          const description = descriptions.map((desc) => {
            if (!desc.includes(":0.00)") && !desc.includes(":0)")) {
              return desc
            }
          }).join("")


          return {
            // label: fs.relativePath,
            // label: `${encodedScore} ${fs.relativePath}`,
            // label: `${encodedScore} ${path.basename(fs.filePath)}`,
            label: path.basename(fs.filePath),
            // description: `${fs.relativePath} - ${finalScore.toFixed(2)}=(raw:${(
            //   fs.rawScore * scoreWeights.matchQuality
            // ).toFixed(2)})(rec:${(
            //   recencyScoreMapped * scoreWeights.recency
            // ).toFixed(2)})(frq:${(
            //   frequencyScoreMapped * scoreWeights.frequency
            // ).toFixed(2)})(cls:${(
            //   closeScoreMapped * scoreWeights.close
            // ).toFixed(2)})`,
            description: description,
            // description: fs.relativePath,
            filePath: fs.filePath,
            relativePath: fs.relativePath,
            iconPath:
              filesToIcon.get(fs.filePath) || new vscode.ThemeIcon("file"), // Apply the icon as needed
            rawScore: fs.rawScore,
            recencyScore: recencyScoreMapped,
            frequencyScore: frequencyScoreMapped,
            closeScore: closeScoreMapped,
            finalScore: finalScore,
          };
        })
    )
  )
    // .sort((a, b) => b.rawScore - a.rawScore)
    .sort((a, b) => b.finalScore - a.finalScore)
    // Map to QuickPick items
    .map(
      (item): FileQuickPickItem => ({
        label: item.label,
        description: item.description,
        filePath: item.filePath,
        relativePath: item.relativePath,
        iconPath: item.iconPath,
        rawScore: item.rawScore,
        recencyScore: item.recencyScore,
        frequencyScore: item.frequencyScore,
        closeScore: item.closeScore,
        finalScore: item.finalScore,
      })
    );

  // This code maps the scores to a range of 0 to maxScoreValue
  // TODO: Validate that this is working correctly
  // const normalizedScores = filteredItems.map((item) =>
  //   Math.round(item.rawScore - minScore)
  // );
  // const maxNormalizedScore = Math.max(...normalizedScores);

  // // Loop through filteredItems and add inverted encoded score to the label
  // for (let i = 0; i < filteredItems.length; i++) {
  //   const item = filteredItems[i];
  //   const normalizedScore = normalizedScores[i];
  //   const invertedScore = maxNormalizedScore - normalizedScore;
  //   // const encodedScore = encodeScore(invertedScore, Math.max(minLength, 4));
  //   const encodedScore = encodeScore(invertedScore, minLength);
  //   filteredItems[i].label = `${encodedScore} ${item.label}`;
  // }
  // const scoreLengths = filteredItems.map((item) =>
  //   item.rawScore.toString().length
  // );
  // const maxLength = Math.max(...scoreLengths);
  // const maxLength = Math.max(filteredItems.length.toString().length + 1, 2);

  // console.log("Filtered Items before:", filteredItems);
  const maxLength = filteredItems.length.toString().length;
  for (let i = 0; i < filteredItems.length; i++) {
    const item = filteredItems[i];
    const length = i.toString().length;

    if (length < maxLength) {
      const diff = maxLength - length;
      const spaces = "1".repeat(diff);
      filteredItems[i].label = `${spaces}${i} ${item.label}`;
    } else {
      filteredItems[i].label = `${i} ${item.label}`;
    }
  }
  // Readd the current file to the list
  // filteredItems.push({
  //   label: `${"9".repeat(maxLength)} ${path.basename(
  //     currentActiveEditor?.document.uri.fsPath || ""
  //   )}`,
  //   description: "Current file",
  //   filePath: currentActiveEditor?.document.uri.fsPath || "",
  //   relativePath: vscode.workspace.asRelativePath(
  //     currentActiveEditor?.document.uri.fsPath || ""
  //   ),
  //   iconPath: filesToIcon.get(currentActiveEditor?.document.uri.fsPath || ""),
  //   rawScore: 0,
  //   recencyScore: 0,
  //   frequencyScore: 0,
  //   closeScore: 0,
  //   finalScore: 0,
  // });
  // console.log("Filtered Items after:", filteredItems);

  return filteredItems;
}

export async function GetAllFilesInWorkspace(): Promise<string[]> {
  if (!vscode.workspace.workspaceFolders) {
    vscode.window.showInformationMessage("No workspace is open.");
    return [];
  }

  const allFiles: Set<string> = new Set();

  for (const workspaceFolder of vscode.workspace.workspaceFolders) {
    const folderPath = workspaceFolder.uri.fsPath;
    const pattern = new vscode.RelativePattern(folderPath, "**/*");

    // Load and parse .gitignore
    const gitignorePath = path.join(folderPath, ".gitignore");
    const ig = ignore();
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
      ig.add(gitignoreContent);
    }

    // Get all files in the workspace folder
    const files = await vscode.workspace.findFiles(pattern);
    files.forEach((file) => {
      const relativePath = path.relative(folderPath, file.fsPath);
      // Apply .gitignore filtering
      if (!ig.ignores(relativePath)) {
        allFiles.add(file.fsPath);
      }
    });
  }

  return Array.from(allFiles);
}

// const charset = '<>:"/\\|?*'; // Valid characters for encoding
// const base = charset.length; // Base is the length of charset

// const charset =
//   "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
// const base = charset.length; // 62

// const charset =
//   "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
// const base = charset.length; // 62

// const charset = "0123456789";
// 123456789
const charset = "0123456789";
// const charset = "¹²³⁴⁵⁶⁷⁸⁹";
// const charset = '¹²³⁰⁴⁵⁶⁷⁸⁹';
// const charset = 'ʰʲᵃᵇᵈᵉᵍᵏᶜᶠ';
const base = charset.length; // 62

function encodeScore(num: number, minLength: number): string {
  console.log(num, minLength);
  // Ensure num is non-negative and base is valid
  if (num < 0) {
    throw new Error("encodeScore received a negative number");
  }

  if (base <= 0) {
    throw new Error("Base must be greater than 0");
  }

  let encoded = "";

  // Loop to encode the number in the given base
  do {
    const remainder = num % base;

    // Ensure remainder is a valid index in the charset
    if (remainder < 0 || remainder >= base) {
      throw new RangeError(`Invalid remainder value: ${remainder}`);
    }
    // Check for very large numbers causing runaway loops
    if (encoded.length > 1000) {
      console.log(encoded);
      throw new RangeError("Encoded string length exceeded 1000 characters.");
    }
    console.log(remainder, charset[remainder]);
    encoded = charset[remainder] + encoded;
    num = Math.floor(num / base);
  } while (num > 0);

  // Pad with the first character ('<') to ensure consistent length
  while (encoded.length < minLength) {
    encoded = charset[0] + encoded; // Pad with the first character of charset
  }

  return encoded;
}

const debounceDelay = 150;
function debounce(func: Function, delay: number) {
  let timeoutId: NodeJS.Timeout;
  let uriList: vscode.Uri[] = [];

  return function (uri: vscode.Uri) {
    uriList.push(uri);
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(uriList);
      uriList = [];
    }, delay);
  };
}

async function getAllTextDocumentsInWorkspace(): Promise<
  vscode.TextDocument[]
> {
  if (!vscode.workspace.workspaceFolders) {
    vscode.window.showInformationMessage("No workspace is open.");
    return [];
  }

  const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
  const pattern = new vscode.RelativePattern(workspaceFolder, "**/*");

  const files = await vscode.workspace.findFiles(pattern, "**/node_modules/**");
  const allFiles: vscode.TextDocument[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      allFiles.push(await vscode.workspace.openTextDocument(file));
    } catch (error) {
      console.error(`Error opening file: ${error}`);
    }
  }
  return allFiles;
}
