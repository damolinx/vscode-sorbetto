# Sorbetto for VS Code

Sorbetto is a Visual Studio Code extension that provides language support for Ruby via [Sorbet](https://github.com/sorbet/sorbet), a type checker developed by Stripe. It began as a fork of the official [Ruby Sorbet](https://github.com/sorbet/sorbet/tree/master/vscode_extension) extension, originally created to explore improvements in code maintainability and user experience (UX).

Since then, Sorbetto's internals have been extensively rewritten, and new functionality has been added. While it continues to serve as an experimentation platform, it now follows its own path—compatibility with the original extension is no longer a priority.

Note that both extensions rely on the same Sorbet [Language Server](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide#why-language-server), so any differences in behavior occur exclusively in the VS Code layer.

## Features

- [Multi-root workspace](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces) support, including separate Sorbet LSP instances per workspace folder
- Uses the [Language Status Item](https://code.visualstudio.com/api/references/vscode-api#LanguageStatusItem) to report status
- New configuration model
- Getting started experience:
  - Set up a workspace for Ruby development via the **Setup Workspace** command
  - `Gemfile` files include an **Install** action
  - Code snippets are available to create standard Sorbet constructs
- Autocomplete is enabled in several contexts:
  - `require_relative` statements
  - `gem` entries in `Gemfile` files
  - `# typed` sigils
- Improved quickfix actions, e.g., fix all instances of a given error code across all files ([documentation](https://sorbet.org/docs/cli#limiting-autocorrect-suggestions)).

### Maintainability Updates
- Minimum VS Code version updated to 1.99, enabling use of more recent extensibility APIs.
- Language Client library upgraded to version 9.0.
- Migration to `esbuild` enables minification and bundling, resulting in a significantly smaller extension footprint.

## Multi-root Workspaces
[Multi-root workspaces](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces) allow developers to work on multiple project folders simultaneously within a single VS Code window. Each folder is treated independently, with its own settings, extensions, and language server instances. Extensions must be intentionally coded to handle all references as potentially belonging to different projects—and Sorbetto is designed with this in mind, creating a separate Sorbet LSP client for every configured workspace folder.

Two aspects to be aware of:

- When context is needed to determine the target of an action—e.g., showing the appropriate language status items—the current active text editor is used as a cue. If an action cannot determine its target workspace, a selection dropdown will be shown. This typically occurs with VS Code stock commands that do not accept a URI as context.

- Configuration values are read in the following order of precedence: first from the workspace folder, then the workspace, and finally the user scope. Be sure to set configuration values at the appropriate layer. Note that UI settings can only be set at workspace or user level. This is likely the most complex management piece you will encounter when using multi-root workspaces, so refer to the [documentation](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces#_settings) if needed. 
 
## Sorbet Language Status Item
Sorbetto replaces the custom **Sorbet** status bar item from the official extension with the standard [Language Status Item](https://code.visualstudio.com/api/references/vscode-api#LanguageStatusItem) for Ruby. This approach enables the display of multiple status entries with accompanying actions in a unified and consistent UI. It is possible to pin specific entries to the status bar for quick access, preserving familiar functionality from the official extension design.

<p align=center>
  <img width="376" height="128" src="https://github.com/user-attachments/assets/5ca5466e-bacd-41a6-a5f9-07fdfd7051e5" alt="Ruby Language Item with Sorbetto entries and statusbar-pinned Status item with Sorbet in Idle state target Stable configuration" />
</p>

The following entries are available on the language status item:
- **Sorbet Configuration**: shows the active Sorbet LSP configuration name as set via `sorbetto.sorbetLspConfiguration`, along with a quick **Configure** action to modify it.
- **Sorbet Status**: displays the current status of the Sorbet LSP, including a busy indicator. The **Output** action brings the **Sorbetto** Output pane into view for checking log entries.

## Sorbet Configuration
The configuration component has been fully rewritten. While it may look similar on the surface, the new design leverages stock APIs and is easily extensible. Adding new features to the internal component is straightforward, allowing the settings set to grow and expose more of Sorbet's native functionality.

The concept of "configurations" is simplified to the basic `Stable`, `Custom`, and `Disabled` states, with *Beta* and *Experimental* now being just additional flags. A limited set of experimental features are also available as settings, such as **Enable RBS support** and **Enable `require_ancestor` support**.

## Sorbet Snippets
Sorbetto provides [snippets](https://code.visualstudio.com/docs/editing/userdefinedsnippets) for standard Sorbet constructs on top of the ones offered by Sorbet already. In particular, a whole set of `ruby` language snippets are now available via the **Snippet: Fill File with Snippet** and **Snippet: Insert Snippet** commands.
All snippets have an associated trigger word recognized by IntelliSense while typing, making them easily accessible. For example, typing `abstract` will display the snippets for an abstract class, module, or method, allowing for quick and intuitive code insertion.

<p align=center>
  <img width=400 src="https://github.com/user-attachments/assets/d03241d1-7f83-4485-a59c-be38264e18c0" alt="Sorbet snippets provided by Sorbetto" />
</p>

## Workspace Setup
The **Setup Workspace** command automates all steps from [Adopting Sorbet](https://sorbet.org/docs/adopting) in one convenient place. This command configures `bundler` to install gems locally via `bundle config set --local path 'vendor/bundle'`.

> **Note:** Do not use this command if you prefer globally installed gems; instead, follow the linked documentation to set up your workspace.

## Extension Logs
Sorbetto uses a single output channel to log its exceptions and Sorbet's. The log level can be controlled via the standard **Developer: Set Log Level** command, selecting **Sorbetto** from the dropdown. See [documentation](https://code.visualstudio.com/updates/v1_73#_setting-log-level-per-output-channel) for details.
