import * as vscode from "vscode";
import { printChannelOutput } from "../extension";

// How often to update the status bar text with the remaining time
const updateInterval = 50; // Update every 'updateInterval' ms (Do not go under 5ms)

export class ActionContext {
  private contextId: string;
  private statusBarItem?: vscode.StatusBarItem;
  private isActive: boolean = false;
  private repeatTimeoutIds: NodeJS.Timeout[] = [];
  private timeoutSeconds: number = 3;

  /**
   * Initializes a new instance of the ActionContext class.
   * @param contextId The unique identifier for this action context.
   * @param timeoutSeconds The number of seconds before the action context is deactivated.
   * @param onDeactivate A callback function that is called when the action context is deactivated.
   * @param onActivate An optional callback function that is called when the action context is activated.
   */
  constructor(
    contextId: string,
    timeoutSeconds: number,
    private onDeactivate: (contextId: string) => void,
    private onActivate?: (contextId: string) => void
  ) {
    printChannelOutput(
      `  Creating context: ${contextId} timeout: ${timeoutSeconds}`,
      true
    );
    this.contextId = contextId;
    this.timeoutSeconds = timeoutSeconds;
  }
  
  /**
   * @returns Whether the action context is active.
   */
  public IsActive(): boolean {
    return this.isActive;
  }

  /**
   * Activates the action context, creating and showing a status bar item, executing the provided command, and starting the repeat timeout.
   * @param command - The command to execute when the action context is activated.
   */
  activate(command: string) {
    if (this.isActive) {
      // Clear existing timeouts
      this.startRepeatTimeout();
    } else {
      // Create and show the status bar item
      this.statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        1000
      );
      this.statusBarItem.text = `░ ${this.contextId} ░`;
      this.statusBarItem.show();
    }

    printChannelOutput(`  Activating context: ${this.contextId}`, true);
    vscode.commands.executeCommand("setContext", this.contextId, true);
    this.isActive = true;

    // Execute the command
    vscode.commands.executeCommand(command);

    // Start the repeat timeout
    this.startRepeatTimeout();

    // Update the global state if necessary
    // You can manage global state outside this class if needed
    if (this.onActivate) {
      this.onActivate(this.contextId);
    }
  }

  /** 
   * Disposes of the status bar item and clears any active timeouts associated with the action context.
   *
   * This method is called when the action context is being deactivated or destroyed. It ensures that
   * any UI elements and scheduled tasks related to the action context are properly cleaned up.
   */
  destruct() {
    // Dispose the status bar item
    if (this.statusBarItem) {
      this.statusBarItem.dispose();
      this.statusBarItem = undefined;
    }

    // Clear timeouts
    this.repeatTimeoutIds.forEach((id) => clearTimeout(id));
    this.repeatTimeoutIds = [];
  }

  /**
   * Deactivates the action context, hiding the status bar item and setting the context to false.
   */
  deactivate() {
    if (!this.isActive) return;

    printChannelOutput(`  Deactivating context: ${this.contextId}`, true);
    vscode.commands.executeCommand("setContext", this.contextId, false);
    this.isActive = false;

    this.destruct();

    // Notify the manager to update global context
    if (this.onDeactivate) {
      this.onDeactivate(this.contextId);
    }
  }

  /**
   * Starts the repeat timeout, updating the status bar countdown and scheduling the deactivation of the action context.
   */
  private startRepeatTimeout() {
    // Clear existing timeouts
    this.repeatTimeoutIds.forEach((id) => clearTimeout(id));
    this.repeatTimeoutIds = [];

    const totalUpdates = (this.timeoutSeconds * 1000) / updateInterval;

    // Update the status bar countdown
    for (let i = 1; i <= totalUpdates; i++) {
      this.repeatTimeoutIds.push(
        setTimeout(() => {
          if (this.statusBarItem) {
            const remainingSeconds = (
              ((totalUpdates - i) * updateInterval) /
              1000
            ).toFixed(1);
            this.statusBarItem.text = `░ ${this.contextId} ░ ${remainingSeconds}`;
          }
        }, i * updateInterval - 5)
      );
    }

    // Set the main timeout to deactivate the context
    this.repeatTimeoutIds.push(
      setTimeout(() => {
        this.deactivate();
      }, this.timeoutSeconds * 1000)
    );
  }
}
