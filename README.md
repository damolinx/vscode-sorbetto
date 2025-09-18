# Sorbetto for VS Code

Sorbetto is a Visual Studio Code extension that provides Ruby language support using [Sorbet](https://github.com/sorbet/sorbet), a static type checker for Ruby. It started as a fork of the official [Ruby Sorbet](https://github.com/sorbet/sorbet/tree/master/vscode_extension) extension to explore code maintainability and user experience (UX) improvements. By now, however, most internals have been rewritten and behaviors have diverged enough to make this extension its own project.

## Features

- Use the [Language Status Item](https://code.visualstudio.com/api/references/vscode-api#LanguageStatusItem) to report status.
- Configuration model is redesigned.
- Getting started with Ruby experiences become a main concern:
  - Setting up a workspace for Sorbet development or running individual files can be done via a single command.
  - Additional code snippets are accessible to create Sorbet artifacts.
  - `Gemfile` receives `gem` autocomplete and custom actions like `Install`.
  - `require_relative` statements are automatically updated and support autocomplete.
  - `# typed` sigil completion provider.
- Improved quickfix actions, e.g., fix all instances of a given error code across all files ([documentation](https://sorbet.org/docs/cli#limiting-autocorrect-suggestions)).

### Maintainability Updates
- Minimum VS Code version updated to 1.99, allowing use of more recent extensibility APIs.
- Language Client library updated to version 9.0.
- Migration to `esbuild` enables minification and bundling, resulting in a significantly smaller code footprint.

## Sorbet Language Status Item
Sorbetto replaces the custom **Sorbet** status bar item from the official extension with the standard [Language Status Item](https://code.visualstudio.com/api/references/vscode-api#LanguageStatusItem) for Ruby. This approach enables the display of multiple status entries with accompanying actions in a unified and consistent UI. It is possible to pin specific entries to the status bar for quick access, preserving functionality from the official extension design.

<p align=center>
  <img width="376" height="128" src="https://github.com/user-attachments/assets/5ca5466e-bacd-41a6-a5f9-07fdfd7051e5" alt="Ruby Language Item with Sorbetto entries and statusbar-pinned Status item with Sorbet in Idle state target Stable configuration" />
</p>

The following entries are available on the language status item:
- **Sorbet Configuration**: shows the active Sorbet LSP configuration name as set via `sorbetto.sorbetLspConfiguration`, along with a quick **Configure** action to modify it.
- **Sorbet Status**: displays the current status of the Sorbet LSP, including a busy indicator. The **Output** action brings the **Sorbetto** Output pane into view for checking log entries.

## Sorbet Configuration
The configuration component has been fully rewritten, and while at the surface it might look similar, the new design allows leveraging stock APIs and easily extending with new features. Adding new features to the internal component is extremely simple, allowing the settings set to grow and expose more of Sorbet's native functionality. With this, the concept of "configurations" is simplified to the basic `Stable`, `Custom`, and `Disabled` states, with *Beta* and *Experimental* as additional options. Likewise, a limited set of experimental features are available as settings like **Enable RBS support** or **Enable `require_ancestor` support**. 

## Sorbet Snippets
Sorbetto provides [snippets](https://code.visualstudio.com/docs/editing/userdefinedsnippets) for standard Sorbet constructs on top of the ones offered by Sorbet already. In particular, a whole set of `ruby` language snippets are now available via the **Snippet: Fill File with Snippet** and **Snippet: Insert Snippet** commands.
All snippets have an associated trigger word recognized by IntelliSense while typing, making them easily accessible. For example, typing `abstract` will display the snippets for an abstract class, module, or method, allowing for quick and intuitive code insertion.

<p align=center>
  <img width=400 src="https://github.com/user-attachments/assets/d03241d1-7f83-4485-a59c-be38264e18c0" alt="Sorbet snippets provided by Sorbetto" />
</p>

## Workspace Setup
The **Setup Workspace** command automates all steps from [Adopting Sorbet](https://sorbet.org/docs/adopting) in one convenient place. When setting up `bundler`, this command will force local installation of gems via `bundle config set --local path 'vendor/bundle'`.

> **Note:** Do not use this command if you prefer globally installed gems; instead, follow the linked documentation to set up your workspace.

## Extension Logs
Sorbetto uses a single output channel to log its exceptions and Sorbet's. The log level can be controlled via the standard **Developer: Set Log Level** command, selecting **Sorbetto** from the dropdown. See [documentation](https://code.visualstudio.com/updates/v1_73#_setting-log-level-per-output-channel) for details.
