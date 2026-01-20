# Sorbetto for VS Code

Sorbetto provides language support for Ruby by leveraging [Sorbet](https://github.com/sorbet/sorbet), a type checker developed by Stripe, while adding tools to enhance your Ruby development experience.

It began as a fork of the [Ruby Sorbet](https://github.com/sorbet/sorbet/tree/master/vscode_extension) extension to explore improvements, but its internals have since been rewritten. While it still serves as an experimentation platform, it now follows its own path. Both extensions rely on the same Sorbet [Language Server](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide#why-language-server), and neither ship with an embedded version of Sorbet, so any differences in behavior occur exclusively in the VS Code layer.

Some of the features are unique to Sorbetto: [multi-root workspace](#multi-root-workspaces) support, [language status item](#sorbet-language-status-item) support, new [configuration model](#working-with-sorbet), a simpler [getting started](#setting-up-a-workspace) experience, [editor enhancements](#editor-enhancements), editor support for [RBS signature comments](#rbs-support), [`sorbet/config`](#sorbetconfig) and [`Gemfile`](#gemfile-tools), and much more.

There are several improvements to internal implementation, like the ability to easily upgrade the [Language Client library](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide#implementing-a-language-server) (currently targeting 9.0), and use of `esbuild` for bundling and minification which has significantly reduced the extension's footprint.

> **Platform Support**: The extension runs wherever VS Code does, though full functionality depends on Sorbet's [supported platforms](https://sorbet.org/docs/faq#what-platforms-does-sorbet-support).

## Table of Contents
* [Getting Started](#getting-started)
  * [Setting Up a Workspace](#setting-up-a-workspace)
  * [Verifying Everything Works](#verifying-everything-works)
* [Configuration](#configuration)
  * [Preferences](#preferences)
  * [Sorbet](#sorbet)
  * [Sorbet Beta & Experimental](#sorbet-beta--experimental)
* [Working with Sorbet](#working-with-sorbet)
  * [Sorbet Language Server](#sorbet-language-server)
  * [sorbet/config](#sorbetconfig)
* [Extension Features](#extension-features)
  * [Commands](#commands)
  * [Multi-root Workspaces](#multi-root-workspaces)
  * [Sorbet Language Status Item](#sorbet-language-status-item)
  * [Sorbet Snippets](#sorbet-snippets)
  * [Editor Enhancements](#editor-enhancements)
  * [RBI Tools](#rbi-tools)
  * [RBS Support](#rbs-support)
  * [Gemfile Tools](#gemfile-tools)
* [Logs](#logs)

## Getting Started

Sorbetto provides several standalone features that work even without Sorbet installed, but language services require your workspace to be configured to use Sorbet. The [Adopting Sorbet in an Existing Codebase](https://sorbet.org/docs/adopting) guide outlines the essentials; at a minimum you need Bundler, the Sorbet runtime, and a `sorbet/config` file in your project. Once these requirements are met, Sorbetto can automatically start the Sorbet [Language Server](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide#why-language-server). You can use the **Sorbetto: Setup Workspace** command to [automatically set up](#setting-up-a-workspace) the workspace for you.

### Setting Up a Workspace

1. Open an existing workspace or create a new one from an empty folder.
   * For multi-root workspaces, run the setup command once per Ruby workspace folder.
2. Run the **Sorbetto: Setup Workspace** command.
3. After the command completes, your workspace is ready.

The **Setup Workspace** command automates the steps from [Adopting Sorbet](https://sorbet.org/docs/adopting). It configures `bundler` to install gems locally using:

```
bundle config set --local path 'vendor/bundle'
```

### Verifying Everything Works

The extension provides several [features](#extension-features) that are always active in a Ruby workspace. The Sorbet Language Server, however, starts automatically **only** when your workspace is [configured](#setting-up-a-workspace) correctly.

The easiest way to confirm that Sorbet is running is to check the [language status item](#sorbet-language-status-item) when the active editor is of of `ruby` language. If Sorbet is active, you will find **Sorbet**-prefixed entries indicating the current state of the language server. As long as the status shows it as running, everything is working as expected.

A definitve way to confirm this is functioning correctly is to create a Ruby file and trigger a predictable type error that should be reported by Sorbet:

1. Create a new Ruby file in your workspace, for example:

   **Example:** `example.rb` is `typed: strict` but missing signatures
   ```ruby
   # typed: strict

   class Demo
     def greet(name)
       "Hello, #{name}"
     end
   end
   ```

2. You should immediately get a diagnostic error similar to `The method 'greet' does not have a 'sig'` as error squiggles on `def greet(name)` or as an entry in the **Problems** pane.

3. Add the missing signature to fix the error, either manually or using the a quick fix action:

   **Example:** Updated `example.rb` with missing `sig`
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

If Sorbet is not working:

* Verify that the required [folder structure](https://sorbet.org/docs/adopting#verify-initialization) exists.
  * Even though [multi-root workspaces](#multi-root-workspaces) are supported, Sorbet requires to be configured at the root of the workspace or specific workspace folder.

* If you used the **Sorbetto: Setup Workspace** command, check the installation terminal for permissions or installation errors. The command only adds missing requirements, so it is safe to run it again of needed.

* Check the [extension logs](#logs) for error messages coming from Sorbet. If the language server failed to start there should be messages at the very least calling it out. A normal start will end up witn `Pausing`/`Resuming` log entries.

  **Example:** Log showing a successful start of Sorbet
  ```
  [info] Start Sorbet LSP file:///...
  [info] > bundle exec srb typecheck --lsp --disable-watchman
  [info] > pid 9471
  [info] Pausing
  [info] Resuming
  ```

[↑ Back to top](#table-of-contents)

## Configuration

You can the [Settings Editor](https://code.visualstudio.com/docs/configure/settings#_settings-editor) to modify the **Sorbetto** configuration section, or edit them directly from the [Settings JSON file](https://code.visualstudio.com/docs/configure/settings#_settings-json-file). Consider the [settings precedence rules](https://code.visualstudio.com/docs/configure/settings#_settings-precedence) when modifying them.

Most settings are purely for extensions behaviors but Sorbet-related features that are relevant for LSP runs are exposed as well. Normally they can be configured from the [`sorbet/config`](#sorbetconfig) file, but some like `sorbetto.enablePackageSupport` require to be enabled in both places for a full experience.

### Preferences

| Setting Key                                       | Description |
|---------------------------------------------------|-------------|
| `sorbetto.alwaysShowStatusItems`                  | Keeps the [Sorbet language status item](#sorbet-language-status-item) visible whenever any editor is open. |
| `sorbetto.compactSorbetDiagnostics`               | Reformats Sorbet diagnostic messages into a compact layout in the **Problems** pane and tooltips. |
| `sorbetto.highlightUntypedCode`                   | Enables highlighting of untyped code. |
| `sorbetto.highlightUntypedCodeDiagnosticSeverity` | Sets the severity level used when reporting untyped code. |
| `sorbetto.typedFalseCompletionNudges`             | Shows auto‑completion nudges in `typed: false` files. |
| `sorbetto.updateRequireRelative`                  | Updates `require_relative` statements when files are moved. |

[↑ Back to top](#table-of-contents)

### Sorbet

| Setting Key                             | Description |
|-----------------------------------------|-------------|
| `sorbetto.enableWatchman`               | Controls whether Sorbet uses `watchman` for file‑watching performance. Defaults to `auto`, meaning it is used only when found in your system, `true` will always try to run it, and `false` will not use it. |
| `sorbetto.maximumDiagnosticsCount`      | Maximum number of diagnostics Sorbet will report (**0** means no limit). High values may impact editor performance. |
| `sorbetto.restartFilePatterns`          | Glob patterns that trigger a Sorbet restart when matching files change. |
| `sorbetto.sorbetLspConfiguration`       | Selects which [Language Server configuration](#sorbet-language-server) to use. Accepts: `stable`, `custom` and `disabled`. |
| `sorbetto.sorbetLspCustomConfiguration` | Custom command‑line arguments for launching the Sorbet LSP server when using the `custom` configuration. |
| `sorbetto.sorbetTypecheckCommand`       | Command used to invoke `srb typecheck`. |
| `sorbetto.trace.server`                 | Traces communication between VS Code and the Sorbet language server. |

[↑ Back to top](#table-of-contents)

### Sorbet Beta & Experimental

| Setting Key                           | Description |
|---------------------------------------|-------------|
| `sorbetto.enableAllBetaLspFeatures`   | Enables all Sorbet LSP features marked as **beta**. |
| `sorbetto.enableAllExperimentalLspFeatures` | Enables all Sorbet LSP features marked as **experimental**. |
| `sorbetto.enablePackageSupport`       | Enables experimental support for Sorbet's Ruby package system. |
| `sorbetto.enableRbsSupport`           | Enables experimental RBS support. |
| `sorbetto.enableRequiresAncestor`     | Enables experimental `requires_ancestor` support. |
| `sorbetto.enableRubyfmt`              | Enables experimental document formatting integration with [Rubyfmt](https://github.com/fables-tales/rubyfmt). If Rubyfmt is not installed or not on your `PATH`, this option has no effect. When enabled, Sorbet advertises formatting support to VS Code, and VS Code then treats the extension as providing a formatter. |

[↑ Back to top](#table-of-contents)

## Working with Sorbet

There are two distinct aspects to consider:
- **Type system and annotations**: writing typed Ruby, adding signatures, and understanding Sorbet's type‑checking model.
- **Developer‑tooling support**: powering editor features such as diagnostics, jump‑to‑definition, and inline type information.

This section focuses **only** on the second aspect: how the extension works with Sorbet through the Language Server Protocol (LSP), and the workspace's `sorbet/config` file. For guidance on writing typed Ruby, including how to define signatures, understand Sorbet's type system, and adopt typed patterns effectively, refer to the Sorbet [documentation](https://sorbet.org/docs/overview).

### Sorbet Language Server

A [language server](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide#why-language-server) is the component that normally powers editor features like type checking, diagnostics, and go‑to‑definition. Sorbet provides its own language server, and the extension communicates with it through the Language Server Protocol (LSP). As long as Sorbet is available in your environment, the extension will start the server automatically using the **Stable** configuration. If you need to launch Sorbet differently—for example, without `bundle` or through a wrapper script—you can switch to the **Custom** configuration.

The language server launch mode is controlled by the **Sorbet Lsp Configuration** [setting](#sorbet), which supports the following values:
* **Stable**: runs Sorbet using `bundle exec srb typecheck`, and any other setting values you might have enabled. This is the **default** mode.
* **Custom**: runs Sorbet using a custom command-line you provide in the **Sorbet Lsp Custom Configuration** [setting](#sorbet).
* **Disabled**: disables Sorbet entirely. Extension features that rely on the LSP will no longer function.

Several options under the [Sorbet](#sorbet) and [Srobet Beta & Experimental](#sorbet-beta--experimental) add extra command‑line arguments when launching the server. Keep this in mind when editing [`sorbet/config`](#sorbetconfig), as these values may conflict.

### sorbet/config
Only a subset of Sorbet's configuration options are exposed as extension settings. For additional customization, you can use the `sorbet/config` file in your workspace. The extension provides syntax highlighting, autocomplete, and hover documentation for this file. These features are based on the Sorbet version available when the extension was last updated, so some details may differ from the version you are currently using. Refer to the [Sorbet: Config file](https://sorbet.org/docs/cli#config-file) documentation for the up-to-date list of supported options.

<p align=center>
  <img width="400" alt="`sorbet/config` with syntax highlighting and autocomplete" src="https://github.com/user-attachments/assets/c32e6603-b116-46d1-af04-826bc155e5b0" />
</p>

The extension does not currently detect conflicts between your workspace settings and the values in `sorbet/config`, so be mindful when combining both sources of configuration. Additionally, some Sorbet features—such as package support—must be enabled both in `sorbet/config` **and** via the relevant extension [setting](#sorbet). Otherwise, the internal `srb tc` invocation will not enable the feature, as Sorbet requires both the config entry and the corresponding command‑line flag.

[↑ Back to top](#table-of-contents)

## Extension Features

### Commands

| Command                          | Description |
|----------------------------------|-------------|
| **Copy Symbol**                  | Copies the symbol at the cursor to the clipboard. |
| **Debug Ruby File**              | Debugs the active Ruby file using either the registered `rdbg` debugger type or the `rdbg` executable. Intended for quick verification of standalone scripts, not as a replacement for a workspace [launch configuration](https://code.visualstudio.com/docs/debugtest/debugging-configuration#_launch-configurations). |
| **Peek Hierarchy References**    | Finds all [references](https://sorbet.org/docs/lsp#sorbethierarchyreferences-request) to the symbol under the cursor, including overrides. |
| **Restart Sorbet**               | Restarts the Sorbet language server. |
| **Send Selection to sorbet.run** | Sends the selected Ruby code to [sorbet.run](https://sorbet.run). Limited to 1MB. |
| **Start Sorbet**                 | Starts the Sorbet language server. |
| **Stop Sorbet**                  | Stops the Sorbet language server. |
| **Run Ruby File**                | Executes the active Ruby file. Intended for quick verification of standalone scripts, not as a replacement for a workspace [launch configuration](https://code.visualstudio.com/docs/debugtest/debugging-configuration#_launch-configurations). |
| **Setup Workspace**              | Configures the workspace for Sorbet usage. |
| **Update RBIs**                  | Updates RBI files using Tapioca. |

The following commands are available in the context menu of text editors.

| Command                       | Description |
|-------------------------------|-------------|
| **Copy Symbol**               | Copies the symbol at the cursor to the clipboard. |
| **Peek Hierarchy References** | Finds all [references](https://sorbet.org/docs/lsp#sorbethierarchyreferences-request) to the symbol under the cursor, including overrides. |

<p align=center>
  <img width="269" alt="Text editor context menu showing Sorbetto-specific actions" src="https://github.com/user-attachments/assets/9e40d3fb-74ea-4e73-9b26-381fbcf88bb6" />
</p>

[↑ Back to top](#table-of-contents)

### Multi-root Workspaces
[Multi-root workspaces](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces) let developers work with multiple workspace folders within a single VS Code window. This model requires extensions to resolve all references relative to the correct project root, and to follow specific workspace-aware behaviors.
Starting with version 0.3.0, Sorbetto creates a dedicated Sorbet LSP client for each configured workspace folder. This is especially useful when working on multiple projects with distinct dependencies, or when those dependencies need to be isolated—such as separating frontend and backend environments.

There are two key aspects to be aware of:

* **Context resolution**: When determining the target of an action—such as displaying language status items—Sorbetto uses the currently active text editor as a hint. If the target workspace cannot be inferred, a workspace selection dropdown will be displayed. This typically occurs with VS Code stock commands that do not take in a URI as context.

* **Configuration precedence**: Settings are read in the following order: first from the workspace folder, then the overall workspace, and finally the user scope. Be sure to configure values at the appropriate level. Note that UI settings can only be set at the workspace or user level. This is often the most nuanced aspect of managing multi-root workspaces, so refer to the [documentation](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces#_settings) if needed.

[↑ Back to top](#table-of-contents)

### Sorbet Language Status Item
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

### Sorbet Snippets
Sorbetto provides [snippets](https://code.visualstudio.com/docs/editing/userdefinedsnippets) for standard Sorbet constructs on top of the ones offered by Sorbet already. These are available from the **Snippet: Fill File with Snippet** and **Snippet: Insert Snippet** commands.
All snippets have an associated trigger word recognized by IntelliSense while typing, making them easily accessible. For example, typing `abstract` will display the snippets for an abstract class, module, or method, allowing for quick and intuitive code insertion.

<p align=center>
  <img width=400 src="https://github.com/user-attachments/assets/d03241d1-7f83-4485-a59c-be38264e18c0" alt="Sorbet snippets provided by Sorbetto" />
</p>

[↑ Back to top](#table-of-contents)

### Editor Enhancements

* **Comment Folding**: consecutive Ruby `#` comment lines automatically become collapsible.
* **Selection Ranges**: supports **Expand Selection** and **Shrink Selection** commands via heuristics.
* **[RBS signature comment syntax highlighting](#rbs-support)**: recognizes RBS type signatures embedded in Ruby comments.
* **`require_relative`**: provides autocompletion for paths, paths are active links to the referenced file, paths are updated on rename whwnver possible.
* **`typed`**: hover and autocompletion for `typed` sigils in Ruby files.

[↑ Back to top](#table-of-contents)

### RBI Tools
The set of RBI actions described in the [RBI Files](https://sorbet.org/docs/rbi) documentation is supported by the **Sorbetto: Update RBIs** command. The **DSL** option is of rticular relevance for Rails users.

[↑ Back to top](#table-of-contents)

### RBS Support
This extension adds support for RBS comment signatures with syntax highlighting and simple activation through settings, although language services are still provided by Sorbet itself. Check the [RBS Comments Support](https://sorbet.org/docs/rbs-support) documentation for details.

* RBS signature comments can be enabled using the **Enable RBS support** setting. This controls whether Sorbet makes use of RBS signatures for typing information.

* RBS signature comments (`#:`) always receive targeted syntax highlighting for Sorbet‑supported constructs, including types, generics, tuples, records, and annotations such as `@abstract`, `@final`, `@sealed`, `@interface`, and `@requires_ancestor`.

In [multi-root workspaces](#multi-root-workspaces), each workspace folder can be configured independently to use RBS or Sorbet signatures.

<p align=center>
<img width="332" alt="RBS sig comment highlight" src="https://github.com/user-attachments/assets/e43a8b80-6fb7-40bc-b1af-94d6fbd8f9df" />
</p>

[↑ Back to top](#table-of-contents)

### Gemfile Tools
The **Sorbetto: Setup Workspace** command creates or updates the `Gemfile` file, as necessary. You can also use the **Install** and **Update** CodeLens actions to easily install dependencies using `bundler`, When editing the file, `gem` statements get autocompletion, queried in real-time from [rubygems.org](https://rubygems.org).

[↑ Back to top](#table-of-contents)

## Logs
Sorbetto uses a single output channel to log both its own exceptions and Sorbet's. The log level can be controlled via the standard **Developer: Set Log Level** command, selecting **Sorbetto** from the dropdown. See [documentation](https://code.visualstudio.com/updates/v1_73#_setting-log-level-per-output-channel) for details.

If needed, you can enable detailed logging con communication between VS Code and the Sorbet Language Server using the `sorbetto.trace.server` [setting](#sorbet).

[↑ Back to top](#table-of-contents)
