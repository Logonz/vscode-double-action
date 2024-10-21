// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { printChannelOutput } from "../extension";

interface FileMetadata {
  lastOpened: number; // Timestamp in milliseconds
  openCount: number;
}

const METADATA_KEY = "fileMetadata";
export const MAX_FREQUENCY_SCORE = 1000;

export function getFileMetadata(context: vscode.ExtensionContext): Record<string, FileMetadata> {
  return context.globalState.get<Record<string, FileMetadata>>(METADATA_KEY, {});
}

// export async function initializeMetadata(context: vscode.ExtensionContext, filePath: string): Promise<void> {
//   const metadata = getFileMetadata(context);

//   if (!metadata[filePath]) {
//     metadata[filePath] = {
//       lastOpened: 0,
//       openCount: 0,
//     };
//     await context.globalState.update(METADATA_KEY, metadata);
//   }
// }

export async function updateFileMetadata(
  context: vscode.ExtensionContext,
  filePath: string,
  time: number = Date.now()
): Promise<void> {
  const metadata = getFileMetadata(context);
  const currentTime = time;

  if (metadata[filePath]) {
    metadata[filePath].lastOpened = currentTime;
    // Only keep track of the last 1000 times the file was opened
    metadata[filePath].openCount = Math.min(metadata[filePath].openCount + 1, MAX_FREQUENCY_SCORE);
  } else {
    metadata[filePath] = {
      lastOpened: currentTime,
      openCount: 1,
    };
  }

  await context.globalState.update(METADATA_KEY, metadata);
}

// Clean up file metadata that is older than 30 days + openCount / 50 days.
// Will only be run once when the extension is activated.
export function cleanUpFileMetadata(context: vscode.ExtensionContext): void {
  const metadata = getFileMetadata(context);
  const currentTime = Date.now();

  for (const [filePath, fileMetadata] of Object.entries(metadata)) {
    const timeDifference = currentTime - fileMetadata.lastOpened;
    const daysDifference = timeDifference / (1000 * 60 * 60 * 24); // convert to days

    if (daysDifference > 30 + metadata[filePath].openCount / 50) {
      // With 1000 as a value it will add 20 days to the 30 days
      printChannelOutput(
        `Removing metadata for ${filePath} because it is over ${30 + metadata[filePath].openCount / 50} days old.`
      );
      delete metadata[filePath];
    }
  }

  context.globalState.update(METADATA_KEY, metadata);
}
