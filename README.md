# Double Action - VS Code Extension

The **Double Action** extension allows you to bind a single key to two different commands based on whether the key is pressed once or twice within a configurable time window. Additionally, it introduces a **timeout mode**, allowing more control over how and when the single press action is executed.

## Features

- **Single Press Command**: Executes a configurable command when the key is pressed once.
- **Double Press Command**: Executes a different command if the key is pressed twice within a threshold time (double-press).
- **Pre Double Press Command**: Optionally execute a command before the double press command (e.g., to exit from a previous state or clear the selection).
- **Timeout Mode**: Control the behavior of the single press. When **timeout mode** is enabled, the single press command waits until the double press threshold has passed before executing, ensuring that no double press has occurred.
- **Customizable Threshold**: Set the threshold time (in milliseconds) within which a second key press is considered a double press.

## Commands

- **Double Action: Execute** (`double-action.execute`): The main command that triggers single or double actions based on the key press timing.

## Default Keybinding

The default keybinding for the `execute` command is:

- **F21**: You can configure the keybinding in your `keybindings.json` file if needed.

### Example Keybinding

```json
{
  "command": "double-action.execute",
  "key": "f21",
  "mac": "f21",
  "when": "editorTextFocus"
}
```

## Configuration Options

This extension exposes several configuration options under the `double-action` namespace:

| Setting                           | Type    | Default                       | Description |
|------------------------------------|---------|-------------------------------|-------------|
| `double-action.timeoutPress`       | boolean | `false`                       | If `true`, the single press command will wait for the double press threshold to pass before executing. This ensures the single press action is only executed if no double press occurs. |
| `double-action.singlePressCommand` | string  | `findJump.activate`            | The command to execute on a single key press. |
| `double-action.preDoublePressCommand` | string | `findJump.activateWithSelection` | Command to execute before the double press action, useful for clearing previous states. Set to an empty string if not needed. |
| `double-action.doublePressCommand` | string  | `findJump.activateWithSelection`| The command to execute on a double key press. |
| `double-action.doublePressThreshold`| number | 800                           | The time in milliseconds to consider a key double pressed. After this time, it resets the internal state. |

To change these settings, open your settings JSON file (or use the GUI) and add or modify the relevant configuration:

```json
{
  "double-action.timeoutPress": true,
  "double-action.singlePressCommand": "your.singlePressCommand",
  "double-action.preDoublePressCommand": "",
  "double-action.doublePressCommand": "your.doublePressCommand",
  "double-action.doublePressThreshold": 800
}
```

## Timeout Mode

If you enable **timeout mode** by setting `double-action.timeoutPress` to `true`, the behavior of the extension changes:

- The **single press command** will not execute immediately but will wait for the double press threshold to pass. If no second press is detected, the single press command will be executed.
- The **double press command** will execute immediately on detection of a double press.

This mode is useful when you want to avoid triggering the single press command before confirming if the user intends to double press.

## Usage

1. Install the extension from the VS Code marketplace or by using a `.vsix` package.
2. Configure the commands for single press, pre-double press, and double press actions in the settings.
3. Use the default keybinding (`F21`) or configure your own keybinding.
4. Press the key once for the single press action or twice quickly for the double press action.
5. Optionally enable **timeout mode** for additional control over single and double press behavior.

## Installation

You can install this extension in two ways:

1. **Marketplace**: Search for "Double Action" in the VSCode Extensions Marketplace and click "Install".
2. **Manual Installation**: Use the following command to install the extension from a `.vsix` file:
    ```bash
    code --install-extension vscode-double-action.vsix
    ```

## Development

To build and develop this extension locally, you can use the following scripts:

- `npm run compile`: Compiles the TypeScript source.
- `npm run watch`: Watches for changes and recompiles the source automatically.
- `npm run test`: Runs tests using the VS Code Test Runner.

## Issues & Contributions

If you find a bug or want to suggest a feature, please open an issue on [GitHub](https://github.com/Logonz/vscode-double-action/issues).

Contributions are welcome! Feel free to fork the repository and submit a pull request.
