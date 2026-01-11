# Sorbetto for VS Code

Sorbetto provides language support for Ruby by leveraging [Sorbet](https://github.com/sorbet/sorbet), a type checker developed by Stripe.

It began as a fork of the [Ruby Sorbet](https://github.com/sorbet/sorbet/tree/master/vscode_extension) extension to explore improvements, but its internals have since been rewritten. While it still serves as an experimentation platform, it now follows its own path. Both extensions rely on the same Sorbet [Language Server](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide#why-language-server), and neither ship with an embedded version of Sorbet, so any differences in behavior occur exclusively in the VS Code layer.

The following features are unique to Sorbetto:

* [Multi-root workspace](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces) support, with separate Language Server instances per workspace folder.
* [Language Status Item](https://code.visualstudio.com/api/references/vscode-api#LanguageStatusItem) integration.
* New configuration model, including an improved experience for working with the `sorbet/config` file.
* Getting-started experience:
  * Set up a workspace for Ruby using the **Setup Workspace** command.
  * Wider set of code snippets for common Sorbet constructs.
* Improved editor support:
  * Ruby files:
    * `require_relative` autocomplete and linking.
    * Syntax highlighting of RBS signature comments.
    * **Peek Usages** supports the [`sorbet/hierarchyReferences`](https://sorbet.org/docs/lsp#sorbethierarchyreferences-request) request.
    * Improved selection expansion and shrinking.
  * `sorbet/config`:
    * Autocomplete and inline documentation for `srb` options.
    * Syntax highlighting.
  * `Gemfile`:
    * autocomplete for `gem` entries fetched live from https://rubygems.org.
    * Management CodeLens actions.
* Diagnostics improvements:
  * Compact layout for diagnostic messages.
  * Expanded quick-fix actions, including the ability to fix all instances of a given error code across all files ([documentation](https://sorbet.org/docs/cli#limiting-autocorrect-suggestions)).

From the internal implementation side, there are several improvements as well:

* Minimum VS Code version raised to 1.99, enabling newer extensibility APIs while maintaining **Cursor** compatibility.
* Language Client library upgraded to version 9.0.
* Switched to `esbuild` for bundling and minification, significantly reducing the extension's footprint.

> **Platform Support**: The extension runs wherever VS Code does, though full functionality depends on Sorbet's [supported platforms](https://sorbet.org/docs/faq#what-platforms-does-sorbet-support).

## Table of Contents
* [Getting Started](#getting-started)
  * [Setting Up a Workspace](#setting-up-a-workspace)
  * [Verifying Everything Works](#verifying-everything-works)
  * [Writing Typed Ruby](#writing-typed-ruby)
* [Commands](#commands)
* [Configuration](#configuration)
  * [Sorbetto for VS Code](#main-settings)
  * [Preferences](#preferences)
  * [Beta & Experimental](#beta--experimental)
* [Sorbet Configuration](#sorbet-configuration)
* [Sorbet Language Status Item](#sorbet-language-status-item)
* [Sorbet Snippets](#sorbet-snippets)
* [Multi-root Workspaces](#multi-root-workspaces)
* [RBI Tools](#rbi-tools)
* [RBS Support](#rbs-support)
* [Workspace Setup](#workspace-setup)
* [Gemfile](#gemfile-tools)
* [Extension Logs](#extension-logs)

## Getting Started

Sorbetto provides several standalone features that work even without Sorbet installed, but language services require your workspace to be configured to use Sorbet. The [Adopting Sorbet in an Existing Codebase](https://sorbet.org/docs/adopting) guide outlines the essentials; at a minimum you need Bundler, the Sorbet runtime, and a `sorbet/config` file in your project. Once these requirements are met, Sorbetto can automatically start the Sorbet [Language Server](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide#why-language-server). You can use the **Sorbetto: Setup Workspace** command to [automatically set up](#setting-up-a-workspace) the workspace for you.

### Setting Up a Workspace
1. Open an existing workspace or create a new one from an empty folder.
2. Run the **Sorbetto: Setup Workspace** command.
3. Once all Your workspace is ready.

> **Multi-root Workspaces**: run the setup command **once per Ruby workspace folder**. While globally installed tools are detected, the command always installs all required assets under the given workspace folder.

### Verifying Everything Works

Verify that the [expected folder structure](https://sorbet.org/docs/adopting#verify-initialization) has been created. If anything looks off or does not work, check the installation terminal and the [extension Logs](#extension-logs) for error messages.

A quick way to confirm that your workspace setup is functioning correctly is to create a small Ruby file and trigger a predictable type error.

1. Create a new file in your workspace, for example:

   **Example:** `example.rb` is `strict` missing signatures
   ```ruby
   # typed: strict

   class Demo
     def greet(name)
       "Hello, #{name}"
     end
   end
   ```

2. You should immediately see a diagnostic error like:
   ```
   The method 'greet' does not have a 'sig'
   ```
   It will appear as error squiggles on `def greet(name)` and as an entry in the **Problems** pane.

3. Add the missing signature to fix the error, either manually or using the a quick fix:

   **Example:** Updated `example.rb`
   ```ruby
   # typed: strict

   class Demo
     extend T::Sig
     sig { params(name: T.untyped).returns(String) }
     def greet(name)
       "Hello, #{name}"
     end
   end
   ```

4. The missing-sig error should go away.

### Writing Typed Ruby
For guidance on writing typed Ruby, including how to define signatures, understand Sorbet's type system, and adopt typed patterns effectively, refer to the Sorbet [documentation](https://sorbet.org/docs/overview).

[↑ Back to top](#table-of-contents)

## Commands

| Displayed Name                   | Description |
|----------------------------------|-------------|
| **Copy Symbol to Clipboard**     | Copies the symbol at the cursor to the clipboard. |
| **Debug Ruby File**              | Starts an `rdbg` debug session for the active Ruby file. Intended for quick verification of standalone scripts, not as a replacement for a [launch configuration](https://code.visualstudio.com/docs/debugtest/debugging-configuration#_launch-configurations). |
| **Peek Usages**                  | Finds all [references](https://sorbet.org/docs/lsp#sorbethierarchyreferences-request) to the symbol under the cursor, including overrides. |
| **Restart Sorbet**               | Restarts the Sorbet language server. |
| **Send Selection to sorbet.run** | Sends the selected Ruby code to [sorbet.run](https://sorbet.run). Limited to 1MB. |
| **Start Sorbet**                 | Starts the Sorbet language server. |
| **Stop Sorbet**                  | Stops the Sorbet language server. |
| **Run Ruby File**                | Executes the active Ruby file. Intended for quick verification of standalone scripts, not as a replacement for a [launch configuration](https://code.visualstudio.com/docs/debugtest/debugging-configuration#_launch-configurations). |
| **Setup Workspace**              | Configures the workspace for Sorbet usage. |
| **Update RBIs**                  | Updates RBI files using Tapioca. |

[↑ Back to top](#table-of-contents)

## Configuration

### Main Settings

| Setting Key                           | Description |
|---------------------------------------|-------------|
| `sorbetto.enableWatchman`             | Controls whether Sorbet uses `watchman` for file‑watching performance. Defaults to `Auto`, meaning it is used is found in your system. |
| `sorbetto.restartFilePatterns`        | Glob patterns that trigger a Sorbet restart when matching files change. |
| `sorbetto.sorbetLspConfiguration`     | Selects which LSP [configuration](#sorbet-configuration) to use. |
| `sorbetto.sorbetLspCustomConfiguration` | Custom command‑line arguments for launching the Sorbet LSP server when using the `Custom` configuration. |
| `sorbetto.sorbetTypecheckCommand`     | Command used to invoke `srb typecheck`. |

[↑ Back to top](#table-of-contents)

### Preferences

| Setting Key                                   | Description |
|-----------------------------------------------|-------------|
| `sorbetto.alwaysShowStatusItems`              | Keeps the [Sorbet language status item](#sorbet-language-status-item) visible whenever any editor is open. |
| `sorbetto.compactSorbetDiagnostics`           | Reformats Sorbet diagnostic messages into a compact layout in the **Problems** pane and tooltips. |
| `sorbetto.highlightUntypedCode`               | Enables highlighting of untyped code. |
| `sorbetto.highlightUntypedCodeDiagnosticSeverity` | Sets the severity level used when reporting untyped code. |
| `sorbetto.typedFalseCompletionNudges`         | Shows auto‑completion nudges in `typed: false` files. |
| `sorbetto.updateRequireRelative`              | Updates `require_relative` statements when files are moved. |

[↑ Back to top](#table-of-contents)

### Beta & Experimental

| Setting Key                           | Description |
|---------------------------------------|-------------|
| `sorbetto.enableAllBetaLspFeatures`   | Enables all Sorbet LSP features marked as **beta**. |
| `sorbetto.enableAllExperimentalLspFeatures` | Enables all Sorbet LSP features marked as **experimental**. |
| `sorbetto.enablePackageSupport`       | Enables support for Sorbet's experimental Ruby package system. |
| `sorbetto.enableRequiresAncestor`     | Enables experimental `requires_ancestor` support. |
| `sorbetto.enableRbsSupport`           | Enables experimental RBS support. |

[↑ Back to top](#table-of-contents)

## Sorbet Configuration
Use the [Settings Editor](https://code.visualstudio.com/docs/configure/settings#_settings-editor) to modify the **Sorbetto** configuration section.

The most important setting to be aware of is **Sorbet Lsp Configuration**, which provides the following values:
* **Stable**: runs Sorbet using `bundle exec srb typecheck`, and any other settings values you might have enabled. This is the default mode.
* **Custom**: runs Sorbet using a custom command-line you provide in the **Sorbet Lsp Custom Configuration** setting.
* **Disabled**: disables Sorbet entirely.

When compared to the official extension, *Beta* and *Experimental* are not configuration modes here but instead settings you can enable separately for flexibility. A set of features are exposed as standalone settings, such as **Enable RBS support** and **Enable `require_ancestor` support** for better UX. The extension attempts to de-duplicate configuration values whenever they might overlap.

### `sorbet/config`
Only a limited set of Sorbet configuration values are exposed as extension settings. Further customization can be done using the `sorbet/config` file in your workspace. Check the [Sorbet: Config file](https://sorbet.org/docs/cli#config-file) documentation for details.

This file is enhanced with syntax highlighting, autocomplete and hover documentation. Because the latter features are based on the specific Sorbet version at the time they were written, details might differ from the version you are currently using. Follow the official Sorbet documentation in such cases.

<p align=center>
  <img width="400" alt="sorbet/config with syntax highlighting and autocomplete" src="https://github.com/user-attachments/assets/c32e6603-b116-46d1-af04-826bc155e5b0" />
</p>

The extension does not check today for conflicts between your workspace settings and the `sorbet/config` file.

[↑ Back to top](#table-of-contents)

## Sorbet Language Status Item
Sorbetto uses a [Language Status Item](https://code.visualstudio.com/api/references/vscode-api#LanguageStatusItem) for Ruby to report LSP status. This approach provides a unified, consistent UI that can display multiple status entries with associated actions. Specific entries can also be pinned to the status bar for quick access.

<p align=center>
  <img width="376" height="128" src="https://github.com/user-attachments/assets/5ca5466e-bacd-41a6-a5f9-07fdfd7051e5" alt="Ruby Language Item with Sorbetto entries and a pinned Status item with Sorbet in Idle state and targeting a Stable configuration" />
</p>

The following entries are available on the language status item:
* **Sorbet Configuration**: shows the active Sorbet LSP configuration name as set via `sorbetto.sorbetLspConfiguration`, along with a quick **Configure** action to modify it.
* **Sorbet Status**: displays the status of the Sorbet LSP, including a busy indicator. The **Output** action brings the **Sorbetto** Output pane into view for checking log entries.

VS Code displays the language status item only when an editor for the matching language is open. You can extend this behavior to editors of any language by enabling the **Sorbetto: Always Show Status Items** setting. However, at least one editor must still be open for the item to appear.

When using [multi-root workspaces](#multi-root-workspaces), the currently focused editor determines which LSP instance's status is shown. At present, there is no mechanism to display status across all instances simultaneously.

[↑ Back to top](#table-of-contents)

## Sorbet Snippets
Sorbetto provides [snippets](https://code.visualstudio.com/docs/editing/userdefinedsnippets) for standard Sorbet constructs on top of the ones offered by Sorbet already. These are available from the **Snippet: Fill File with Snippet** and **Snippet: Insert Snippet** commands.
All snippets have an associated trigger word recognized by IntelliSense while typing, making them easily accessible. For example, typing `abstract` will display the snippets for an abstract class, module, or method, allowing for quick and intuitive code insertion.

<p align=center>
  <img width=400 src="https://github.com/user-attachments/assets/d03241d1-7f83-4485-a59c-be38264e18c0" alt="Sorbet snippets provided by Sorbetto" />
</p>

## Multi-root Workspaces
[Multi-root workspaces](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces) let developers work with multiple workspace folders within a single VS Code window. This model requires extensions to resolve all references relative to the correct project root, and to follow specific workspace-aware behaviors.
Starting with version 0.3.0, Sorbetto creates a dedicated Sorbet LSP client for each configured workspace folder. This is especially useful when working on multiple projects with distinct dependencies, or when those dependencies need to be isolated—such as separating frontend and backend environments.

There are two key aspects to be aware of:

* **Context resolution**: When determining the target of an action—such as displaying language status items—Sorbetto uses the currently active text editor as a hint. If the target workspace cannot be inferred, a workspace selection dropdown will be displayed. This typically occurs with VS Code stock commands that do not take in a URI as context.

* **Configuration precedence**: Settings are read in the following order: first from the workspace folder, then the overall workspace, and finally the user scope. Be sure to configure values at the appropriate level. Note that UI settings can only be set at the workspace or user level. This is often the most nuanced aspect of managing multi-root workspaces, so refer to the [documentation](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces#_settings) if needed.

[↑ Back to top](#table-of-contents)

## RBI Tools
The set of RBI actions described in the [RBI Files](https://sorbet.org/docs/rbi) documentation is supported by the **Sorbetto: Update RBIs** command. The **DSL** option is of rticular relevance for Rails users.

[↑ Back to top](#table-of-contents)

## RBS Support
This extension adds support for RBS comment signatures with syntax highlighting and simple activation through settings, although language services are still provided by Sorbet itself. Check the [RBS Comments Support](https://sorbet.org/docs/rbs-support) documentation for details.

* RBS signature comments can be enabled using the **Enable RBS support** setting. This controls whether Sorbet makes use of RBS signatures for typing information.

* RBS signature comments (`#:`) always receive targeted syntax highlighting for Sorbet‑supported constructs, including types, generics, tuples, records, and annotations such as `@abstract`, `@final`, `@sealed`, `@interface`, and `@requires_ancestor`.

In [multi-root workspaces](#multi-root-workspaces), each workspace folder can be configured to use RBS or Sorbet signatures.

<p align=center>
<img width="332" alt="RBS sig comment highlight" src="https://github.com/user-attachments/assets/e43a8b80-6fb7-40bc-b1af-94d6fbd8f9df" />
</p>

[↑ Back to top](#table-of-contents)

## Workspace Setup
The **Setup Workspace** command automates all steps from [Adopting Sorbet](https://sorbet.org/docs/adopting) in one convenient place. This command configures `bundler` to install gems locally via `bundle config set --local path 'vendor/bundle'`.

> **Note:** Do not use this command if you prefer globally installed gems; instead, follow the linked documentation to set up your workspace.

[↑ Back to top](#table-of-contents)

## Gemfile Tools
The **Sorbetto: Setup Workspace** command creates or updates the `Gemfile` file, as necessary. You can also use the **Install** and **Update** CodeLens actions to easily install dependencies using `bundler`, When editing the file, `gem` statements get autocompletion, queried in real-time from [rubygems.org](https://rubygems.org).

[↑ Back to top](#table-of-contents)

## Extension Logs
Sorbetto uses a single output channel to log both its own exceptions and Sorbet's. The log level can be controlled via the standard **Developer: Set Log Level** command, selecting **Sorbetto** from the dropdown. See [documentation](https://code.visualstudio.com/updates/v1_73#_setting-log-level-per-output-channel) for details.

[↑ Back to top](#table-of-contents)









