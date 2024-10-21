import * as vscode from "vscode";
import * as path from "path";
import { minimatch } from "minimatch";

// This entire code is based on the CustomEditorLabelService class from the vscode repo:
// https://github.com/microsoft/vscode/blob/8491f5724fe930cef67c40a2c5c05d2f4d5c2ee5/src/vs/workbench/services/editor/common/customEditorLabelService.ts

// ? Interfaces
export interface ICustomEditorLabelPatterns {
  [pattern: string]: string;
}

interface ICustomEditorLabelPattern {
  pattern: string;
  template: string;
  isAbsolutePath: boolean;
}

// ? Configuration Functions
let customLabelEnabled: boolean = false;
export function IsCustomLabelEnabled(): boolean {
  return customLabelEnabled;
}

let customLabelPatterns: ICustomEditorLabelPatterns = {};
export function GetCustomLabelPatterns(): ICustomEditorLabelPatterns {
  return customLabelPatterns;
}

let customEditorLabelService: CustomEditorLabelService | undefined;
export function updateCustomLabelConfiguration(): void {
  // * Get if custom labels are enabled
  const customLabelsEnabled: boolean | undefined = vscode.workspace
    .getConfiguration("workbench")
    .get<boolean>("editor.customLabels.enabled");

  if (customLabelsEnabled !== undefined) {
    customLabelEnabled = customLabelsEnabled;
  }

  // * Get the custom label patterns
  const customLabelsPatterns: ICustomEditorLabelPatterns | undefined =
    vscode.workspace
      .getConfiguration("workbench")
      .get<ICustomEditorLabelPatterns>("editor.customLabels.patterns");
  
  if (customLabelsPatterns) {
    customLabelPatterns = customLabelsPatterns;
    // * Update the custom editor label service
    customEditorLabelService = new CustomEditorLabelService(customLabelPatterns);
  }
}

export function GetCustomEditorLabelService(): CustomEditorLabelService {
  if (customEditorLabelService === undefined) {
    customEditorLabelService = new CustomEditorLabelService(customLabelPatterns);
  }
  return customEditorLabelService;
}


// ? CustomEditorLabelService - The actual functionality
export class CustomEditorLabelService {
  private patterns: ICustomEditorLabelPattern[] = [];

  constructor(customLabelsPatterns: ICustomEditorLabelPatterns) {
    this.storeCustomPatterns(customLabelsPatterns);
  }

  private storeCustomPatterns(patternsObj: ICustomEditorLabelPatterns) {
    this.patterns = [];
    for (const pattern in patternsObj) {
      const template = patternsObj[pattern];

      const isAbsolutePath = path.isAbsolute(pattern);

      this.patterns.push({ pattern, template, isAbsolutePath });
    }

    // Sort patterns by weight
    this.patterns.sort(
      (a, b) => this.patternWeight(b.pattern) - this.patternWeight(a.pattern)
    );
  }

  private patternWeight(pattern: string): number {
    let weight = 0;
    for (const fragment of pattern.split("/")) {
      if (fragment === "**") {
        weight += 1;
      } else if (fragment === "*") {
        weight += 10;
      } else if (fragment.includes("*") || fragment.includes("?")) {
        weight += 50;
      } else if (fragment !== "") {
        weight += 100;
      }
    }

    return weight;
  }

  public getName(resource: vscode.Uri): string | undefined {
    return this.applyPatterns(resource);
  }

  private applyPatterns(resource: vscode.Uri): string | undefined {
    const root = vscode.workspace.getWorkspaceFolder(resource);
    let relativePath: string | undefined;
    for (const pattern of this.patterns) {
      let relevantPath: string;

      // ? The logic here is a bit strangely converted from the original code...
      // TODO: I think this is correct however unless we test with absolute paths i can't be sure
      if (root && !pattern.isAbsolutePath) {
        if (!relativePath) {
          relativePath = vscode.workspace.asRelativePath(resource);
        }
        relevantPath = relativePath;
      } else {
        relevantPath = resource.path;
      }

      if (minimatch(relevantPath, pattern.pattern)) {
        return this.applyTemplate(pattern.template, resource, relevantPath);
      }
    }

    return undefined;
  }

  private _parsedTemplateExpression =
    /\$\{(dirname|filename|extname|extname\((?<extnameN>[-+]?\d+)\)|dirname\((?<dirnameN>[-+]?\d+)\))\}/g;
  private _filenameCaptureExpression = /(?<filename>^\.*[^.]*)/;

  private applyTemplate(
    template: string,
    resource: vscode.Uri,
    relevantPath: string
  ): string {
    const parsedPath = path.parse(vscode.workspace.asRelativePath(resource));

    return template.replace(
      this._parsedTemplateExpression,
      (match: string, variable: string, ...args: any[]) => {
        const groups = args[args.length - 1]; // The last argument contains named groups
        const dirnameN = groups.dirnameN || "0";
        const extnameN = groups.extnameN || "0";

        if (variable === "filename") {
          const filenameMatch = this._filenameCaptureExpression.exec(
            parsedPath.base
          );
          const filename = filenameMatch?.groups?.filename;
          if (filename) {
            return filename;
          }
        } else if (variable === "extname") {
          const extension = this.getExtnames(parsedPath.base);
          if (extension) {
            return extension;
          }
        } else if (variable.startsWith("extname")) {
          const n = parseInt(extnameN);
          const nthExtname = this.getNthExtname(parsedPath.base, n);
          if (nthExtname) {
            return nthExtname;
          }
        } else if (variable.startsWith("dirname")) {
          const n = parseInt(dirnameN);
          const nthDir = this.getNthDirname(path.dirname(relevantPath), n);
          if (nthDir) {
            return nthDir;
          }
        }

        return match;
      }
    );
  }

  private removeLeadingDot(str: string): string {
    let result = str;
    while (result.startsWith(".")) {
      result = result.slice(1);
    }
    return result;
  }

  private getNthDirname(pathStr: string, n: number): string | undefined {
    // grand-parent/parent/filename.ext1.ext2 -> [grand-parent, parent]
    pathStr = pathStr.startsWith("/") ? pathStr.slice(1) : pathStr;
    const pathFragments = pathStr.split("/");
    // const pathFragments = pathStr.split(path.sep);

    return this.getNthFragment(pathFragments, n);
  }

  private getExtnames(fullFileName: string): string {
    return this.removeLeadingDot(fullFileName).split(".").slice(1).join(".");
  }

  private getNthExtname(fullFileName: string, n: number): string | undefined {
    // file.ext1.ext2.ext3 -> [file, ext1, ext2, ext3]
    const extensionNameFragments =
      this.removeLeadingDot(fullFileName).split(".");
    extensionNameFragments.shift(); // remove the first element which is the file name

    return this.getNthFragment(extensionNameFragments, n);
  }

  private getNthFragment(fragments: string[], n: number): string | undefined {
    const length = fragments.length;

    let nth;
    if (n < 0) {
      nth = Math.abs(n) - 1;
    } else {
      nth = length - n - 1;
    }

    const nthFragment = fragments[nth];
    if (nthFragment === undefined || nthFragment === "") {
      return undefined;
    }
    return nthFragment;
  }
}
