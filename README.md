# Sorbetto for VS Code

Sorbetto provides language support for Ruby via [Sorbet](https://github.com/sorbet/sorbet), a type checker developed by Stripe. It began as a fork of the official [Ruby Sorbet](https://github.com/sorbet/sorbet/tree/master/vscode_extension) extension, created to explore improvements in code maintainability and user experience (UX). Since then, Sorbetto's internals have been rewritten,and while it continues to serve as an experimentation platform, it now follows its own path—compatibility with the official extension is no longer a priority. Note that both extensions rely on the same Sorbet [Language Server](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide#why-language-server), so differences in behavior occur exclusively in the VS Code layer.

### Features
* [Multi-root workspace](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces) support, including separate Sorbet LSP instances per workspace folder
* Uses the [Language Status Item](https://code.visualstudio.com/api/references/vscode-api#LanguageStatusItem) to report status
* Improved configuration model
* Getting started experience:
  * Set up a workspace for Ruby development via the **Setup Workspace** command
  * `Gemfile` files include an **Install** action
  * Provides code snippets for standard Sorbet constructs
* Autocomplete is enabled in several contexts:
  * `require_relative` statements
  * `gem` entries in `Gemfile` files
  * `# typed` sigils
* Improved quickfix actions, e.g., fix all instances of a given error code across all files ([documentation](https://sorbet.org/docs/cli#limiting-autocorrect-suggestions)).

Some of the maintainability updates: 
* Minimum VS Code version updated to 1.99, enabling use of more recent extensibility APIs.
* Language Client library upgraded to version 9.0.
* Migrated to `esbuild` for minification and bundling, reducing extension footprint significantly.

> **Platform Support**: The extension uses cross-platform practices wherever possible. Its compatibility is limited only by the [platforms supported by Sorbet](https://sorbet.org/docs/faq#what-platforms-does-sorbet-support). As a result, Windows-specific codepaths are rarely exercised since Sorbet does not support the platform.

## Table of Contents
* [Getting Started](#getting-started)
  * [Setting Up a Workspace](#setting-up-a-workspace)
  * [Running a Ruby Script](#running-a-ruby-script)
* [Sorbet Language Status Item](#sorbet-language-status-item)
* [Sorbet Configuration](#sorbet-configuration)
* [Sorbet Snippets](#sorbet-snippets)
* [Multi-root Workspaces](#multi-root-workspaces)
* [RBS Support](#rbs-support)
* [Workspace Setup](#workspace-setup)
* [Gemfile](#gemfile-tools)
* [Extension Logs](#extension-logs)

## Getting Started

### Setting Up a Workspace
1. Open an existing workspace, or create a new one from an empty folder.
2. Run the **Sorbetto: Setup Workspace** command.
3. Your workspace is ready to use.

### Running a Ruby Script
1. Create a new Ruby file, such as `main.rb`.
2. Add some content to it — you can use the **Snippets: Fill File with Snippet** command and select a `ruby` snippet.
3. Run the file using the **Sorbetto: Run Ruby File** command.
   * Later, you may want to create a [Launch Configuration](https://code.visualstudio.com/docs/debugtest/debugging-configuration#_launch-configurations), but this command is the fastest way to run a standalone script.

[↑ Back to top](#table-of-contents)

## Sorbet Language Status Item
Sorbetto uses a [Language Status Item](https://code.visualstudio.com/api/references/vscode-api#LanguageStatusItem) for Ruby to report LSP status. This approach provides a unified, consistent UI that can display multiple status entries with associated actions. Specific entries can also be pinned to the status bar for quick access, preserving the familiar UX from the official extension. 

<p align=center>
  <img width="376" height="128" src="https://github.com/user-attachments/assets/5ca5466e-bacd-41a6-a5f9-07fdfd7051e5" alt="Ruby Language Item with Sorbetto entries and statusbar-pinned Status item with Sorbet in Idle state target Stable configuration" />
</p>

The following entries are available on the language status item:
* **Sorbet Configuration**: shows the active Sorbet LSP configuration name as set via `sorbetto.sorbetLspConfiguration`, along with a quick **Configure** action to modify it.
* **Sorbet Status**: displays the current status of the Sorbet LSP, including a busy indicator. The **Output** action brings the **Sorbetto** Output pane into view for checking log entries.

VS Code displays the language status item only when an editor for the matching language is open. You can extend this behavior to editors of any language by enabling the **Sorbetto: Always Show Status Items** setting. However, at least one editor must still be open for the item to appear.

When using [multi-root workspaces](#multi-root-workspaces), the currently focused editor determines which LSP instance's status is shown. At present, there is no mechanism to display status across all instances simultaneously.

[↑ Back to top](#table-of-contents)

## Sorbet Configuration
Use the [Settings Editor](https://code.visualstudio.com/docs/configure/settings#_settings-editor) to modify the configuration values used by the extension.

The most important setting is the `Sorbet Lsp Configuration` which provides the following values:
* **Stable**: runs the Sorbet LSP using `bundle exec srb typecheck`, and any other settings values you might have added.
* **Custom**: runs the Sorbet LSP using a custom command and arguments you provide in the **Sorbet Lsp Custom Configuration** setting.
* **Disabled**: disables Sorbet entirely.

When compared to the official extension, *Beta* and *Experimental* are not configuration modes here but instead settings you can enable separately. Additionally, a limited set of features are exposed as standalone settings, such as **Enable RBS support** and **Enable `require_ancestor` support**. It is expected over time the number of settings will grow. The extension attempts to de-duplicate configuration values whenever they might overlap.

You can also edit the `sorbet/config` file in your workspace directly. However, the extension does not process this file, so you may inadvertently create conflicting configurations. For details, see the [Sorbet: Config file](https://sorbet.org/docs/cli#config-file) documentation.

[↑ Back to top](#table-of-contents)

## Sorbet Snippets
Sorbetto provides [snippets](https://code.visualstudio.com/docs/editing/userdefinedsnippets) for standard Sorbet constructs on top of the ones offered by Sorbet already. In particular, a whole set of `ruby` language snippets are now available via the **Snippet: Fill File with Snippet** and **Snippet: Insert Snippet** commands.
All snippets have an associated trigger word recognized by IntelliSense while typing, making them easily accessible. For example, typing `abstract` will display the snippets for an abstract class, module, or method, allowing for quick and intuitive code insertion.

<p align=center>
  <img width=400 src="https://github.com/user-attachments/assets/d03241d1-7f83-4485-a59c-be38264e18c0" alt="Sorbet snippets provided by Sorbetto" />
</p>

## Multi-root Workspaces
[Multi-root workspaces](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces) let developers work with multiple workspace folders within a single VS Code window. This model requires extensions to resolve all references relative to the correct project root, and to follow specific workspace-aware behaviors.
Starting with version 0.3.0, Sorbetto creates a dedicated Sorbet LSP client for each configured workspace folder. This is especially useful when working on multiple projects with distinct dependencies, or when those dependencies need to be isolated—such as separating frontend and backend environments.

There are two key aspects to be aware of:

* **Context resolution**: When determining the target of an action—such as displaying language status items—Sorbetto uses the currently active text editor as a hint. If the target workspace cannot be inferred, a dropdown will prompt for selection. This typically occurs with VS Code stock commands that don’t accept a URI as context.

* **Configuration precedence**: Settings are read in the following order: first from the workspace folder, then the overall workspace, and finally the user scope. Be sure to configure values at the appropriate level. Note that UI settings can only be set at the workspace or user level. This is often the most nuanced aspect of managing multi-root workspaces, so refer to the [documentation](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces#_settings) if needed. 

[↑ Back to top](#table-of-contents)

## RBS Support
RBS signature comments can be enabled via the **Enable RBS support** setting. This controls whether Sorbet makes use of the RBS signatures for typing information.

Inline RBS signature comments (`#:`) always receive targeted syntax highlighting for Sorbet‑supported constructs, including types, generics, tuples, records, and annotations such as `@abstract`, `@final`, `@sealed`, `@interface`, and `@requires_ancestor`.

[↑ Back to top](#table-of-contents)

## Workspace Setup
The **Setup Workspace** command automates all steps from [Adopting Sorbet](https://sorbet.org/docs/adopting) in one convenient place. This command configures `bundler` to install gems locally via `bundle config set --local path 'vendor/bundle'`.

> **Note:** Do not use this command if you prefer globally installed gems; instead, follow the linked documentation to set up your workspace.

[↑ Back to top](#table-of-contents)

## Gemfile Tools
CodeLens actions are added to `Gemfile` files, making it easy to **Install** or Update dependencies using `bundler`. Additionally, `gem` statements get gem-name autocompletion, queried in real-time from [rubygems.org](https://rubygems.org).

[↑ Back to top](#table-of-contents)

## Extension Logs
Sorbetto uses a single output channel to log both its own exceptions and Sorbet’s. The log level can be controlled via the standard **Developer: Set Log Level** command, selecting **Sorbetto** from the dropdown. See [documentation](https://code.visualstudio.com/updates/v1_73#_setting-log-level-per-output-channel) for details.

[↑ Back to top](#table-of-contents)


