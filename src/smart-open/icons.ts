import * as vscode from "vscode";
import path from "path";
import fs from "fs";
import { printChannelOutput } from "../extension";

const iconDefinitions = new Map<string, vscode.Uri>();
const iconFileNames = new Map<string, vscode.Uri>();
const iconFolderNames = new Map<string, vscode.Uri>();
const iconLanguageIds = new Map<string, vscode.Uri>();
const iconFileExtensions = new Map<string, vscode.Uri>();

export function LoadIcons() {
  printChannelOutput("Loading icons", false);
  const configuration = vscode.workspace.getConfiguration();

  console.log(configuration, configuration.workbench.iconTheme);

  // The full extension
  let iconTheme: vscode.Extension<any> | null = null;

  for (let index = 0; index < vscode.extensions.all.length; index++) {
    const ext = vscode.extensions.all[index];
    if (ext.id.includes(configuration.workbench.iconTheme)) {
      // Print extensions, this contains packageJSON and the path to the extension
      console.log(ext);
      iconTheme = ext;
      break;
    }
  }

  if (iconTheme) {
    const iconContributions = iconTheme.packageJSON.contributes.iconThemes[0];
    const iconExtPath = iconTheme.extensionUri.fsPath;
    console.log("iconExtPath", iconExtPath);

    const iconJSONPath = path.join(iconExtPath, iconContributions.path);
    console.log("iconJSONPath", iconJSONPath);

    // Parse the JSON file
    // Read and parse the JSON file
    try {
      const iconJSONContent = fs.readFileSync(iconJSONPath, "utf8");
      const iconJSON = JSON.parse(iconJSONContent);

      // Example: Iterate through icon definitions
      if (iconJSON.iconDefinitions) {
        Object.entries(iconJSON.iconDefinitions).forEach(([key, value]: any) => {
          // console.log(`Icon: ${key}`, path.join(path.dirname(iconJSONPath), value.iconPath));
          // console.log(`Icon: ${key}`, vscode.Uri.file(path.join(path.dirname(iconJSONPath), value.iconPath)));
          iconDefinitions.set(key, vscode.Uri.file(path.join(path.dirname(iconJSONPath), value.iconPath)));
        });
      }
      if (iconJSON.fileExtensions) {
        Object.entries(iconJSON.fileExtensions).forEach(([key, value]: any) => {
          const iconDefinitionKey = value;
          const icon = iconDefinitions.get(iconDefinitionKey);
          if (icon) {
            iconFileExtensions.set(key, icon);
          }
        });
      }
      if (iconJSON.fileNames) {
        Object.entries(iconJSON.fileNames).forEach(([key, value]: any) => {
          const iconDefinitionKey = value;
          const icon = iconDefinitions.get(iconDefinitionKey);
          if (icon) {
            iconFileNames.set(key, icon);
          }
        });
      }
      if (iconJSON.folderNames) {
        Object.entries(iconJSON.folderNames).forEach(([key, value]: any) => {
          const iconDefinitionKey = value;
          const icon = iconDefinitions.get(iconDefinitionKey);
          if (icon) {
            iconFolderNames.set(key, icon);
          }
        });
      }
      if (iconJSON.languageIds) {
        Object.entries(iconJSON.languageIds).forEach(([key, value]: any) => {
          const iconDefinitionKey = value;
          const icon = iconDefinitions.get(iconDefinitionKey);
          if (icon) {
            iconLanguageIds.set(key, icon);
          }
        });
      }

      // Add more logic to process the iconJSON as needed
    } catch (error) {
      console.error(`Error reading or parsing icon JSON file: ${error}`);
    }
  }
  printChannelOutput("Icons loaded", false);
}

export async function GetIconForFile(file: vscode.Uri): Promise<vscode.Uri | undefined> {
  // Get file extension
  const fileExtension = path.extname(file.fsPath).toLowerCase();

  // Exclude binary files
  if (binaryFileExtensions.has(fileExtension)) {
    console.log(`Binary file detected, skipping: ${file.fsPath}`);
    return undefined;
  }

  try {
    const fileDoc = await vscode.workspace.openTextDocument(file);
    // console.log("DOC", fileDoc.fileName, fileDoc.languageId);

    let gIcon: vscode.Uri | undefined = undefined;
    if (iconLanguageIds.has(fileDoc.languageId)) {
      gIcon = iconLanguageIds.get(fileDoc.languageId);
    }
    if (!gIcon && iconFileExtensions.has(path.extname(fileDoc.fileName))) {
      gIcon = iconFileExtensions.get(path.extname(fileDoc.fileName));
    }
    if (!gIcon && iconFileNames.has(path.basename(fileDoc.fileName))) {
      gIcon = iconFileNames.get(path.basename(fileDoc.fileName));
    }
    if (!gIcon && iconFolderNames.has(path.basename(fileDoc.fileName))) {
      gIcon = iconFolderNames.get(path.basename(fileDoc.fileName));
    }
    if (!gIcon && iconDefinitions.has(fileDoc.languageId)) {
      gIcon = iconDefinitions.get(fileDoc.languageId);
    }

    if (gIcon) {
      return gIcon;
    } else {
      console.log(`No icon found for ${fileDoc.fileName}`);
      printChannelOutput(`No icon found for ${fileDoc.fileName}`, false);
      return undefined;
    }
  } catch (error) {
    console.error(`Error opening file: ${error}`);
    return undefined;
  }
}

// List of binary file extensions
const binaryFileExtensions = new Set([
  // Images
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".tiff",
  ".ico",
  ".svg",
  ".webp",
  ".heic",
  ".nef",
  ".cr2",
  ".arw",
  // Executables and libraries
  ".exe",
  ".dll",
  ".so",
  ".app",
  ".bin",
  ".com",
  ".msi",
  ".out",
  ".class",
  ".deb",
  ".rpm",
  ".apk",
  ".ipa",
  ".xpi",
  // Compiled code / Object files
  ".o",
  ".obj",
  ".a",
  ".lib",
  ".pyc",
  ".pyo",
  ".jar",
  ".war",
  ".wasm",
  ".swiftmodule",
  // Archives
  ".zip",
  ".tar",
  ".gz",
  ".rar",
  ".7z",
  ".iso",
  ".dmg",
  ".cue",
  ".bz2",
  ".xz",
  ".cab",
  ".lzh",
  ".arc",
  ".cbr",
  ".cbz",
  // Media files
  ".mp3",
  ".wav",
  ".aac",
  ".flac",
  ".ogg",
  ".mp4",
  ".mkv",
  ".avi",
  ".mov",
  ".wmv",
  ".webm",
  ".raw",
  ".flv",
  ".f4v",
  ".midi",
  ".mid",
  // Fonts
  ".ttf",
  ".otf",
  ".woff",
  ".eot",
  // Miscellaneous
  ".pdf",
  ".swf",
  ".psd",
  ".ai",
  ".dat",
  ".db",
  ".sqlite",
  ".mdb",
  ".bak",
  ".pak",
  ".vmdk",
  ".qcow2",
  ".dmp",
  ".tlb",
  ".pub",
  // Documents
  ".docx",
  ".xlsx",
  ".pptx",
  ".doc",
  ".xls",
  ".ppt",
  ".pub",
  ".mobi",
  ".epub",
  ".odt",
  ".ods",
  ".odp",
  // 3D Models
  ".blend",
  ".fbx",
  ".stl",
  ".3ds",
  ".dwg",
  ".dxf",
  ".eps",
  ".xcf",
  ".indd",
  ".psb",
]);
