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
        Object.entries(iconJSON.iconDefinitions).forEach(
          ([key, value]: any) => {
            // console.log(`Icon: ${key}`, path.join(path.dirname(iconJSONPath), value.iconPath));
            // console.log(`Icon: ${key}`, vscode.Uri.file(path.join(path.dirname(iconJSONPath), value.iconPath)));
            iconDefinitions.set(
              key,
              vscode.Uri.file(
                path.join(path.dirname(iconJSONPath), value.iconPath)
              )
            );
          }
        );
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
  const fileDoc = await vscode.workspace.openTextDocument(file)
  console.log("DOC", fileDoc.fileName, fileDoc.languageId);
        
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
    console.log(gIcon);
    return gIcon;
  } else {
    printChannelOutput(`No icon found for ${fileDoc.fileName}`, false);
    return undefined;
  }
}