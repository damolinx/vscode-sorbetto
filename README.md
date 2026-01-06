# Sorbetto for VS Code

Sorbetto provides language support for Ruby by leveraging [Sorbet](https://github.com/sorbet/sorbet), a type checker developed by Stripe.

It began as a fork of the official [Ruby Sorbet](https://github.com/sorbet/sorbet/tree/master/vscode_extension) extension to explore improvements, but its internals have since been largely rewritten. While it still serves as an experimentation platform, it now follows its own path. Both extensions rely on the same Sorbet [Language Server](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide#why-language-server), and neither ships with an embedded version of Sorbet, so any differences in behavior occur exclusively in the VS Code layer.

The following features are unique to Sorbetto:

* [Multi-root workspace](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces) support, with separate Language Server instances per workspace folder.
* [Language Status Item](https://code.visualstudio.com/api/references/vscode-api#LanguageStatusItem) integration.
* New configuration model, including an improved experience for working with the `sorbet/config` file.
* Enhanced getting-started experience:
  * Automatically set up the workspace using the **Setup Workspace** command.
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
* Switched to `esbuild` for bundling and minification, significantly reducing the extension’s footprint.

## Table of Contents
* [Getting Started](#getting-started)
  * [Setting Up a Workspace](#setting-up-a-workspace)
  * [Verifying Everything Works](#verifying-everything-works)
  * [Running a Ruby Script](#running-a-ruby-script)
* [Sorbet Configuration](#sorbet-configuration)
* [Sorbet Language Status Item](#sorbet-language-status-item)
* [Sorbet Snippets](#sorbet-snippets)
* [Multi-root Workspaces](#multi-root-workspaces)
* [RBS Support](#rbs-support)
* [Workspace Setup](#workspace-setup)
* [Gemfile](#gemfile-tools)
* [Extension Logs](#extension-logs)

## Getting Started

Sorbetto offers several standalone features—such as RBS syntax highlighting and Gemfile tooling—that work without any Sorbet installation. To access the full experience, including type checking, inline diagnostics, and related tooling, your project must be configured to use Sorbet. The [Adopting Sorbet in an Existing Codebase](https://sorbet.org/docs/adopting) guide outlines the essentials, but in practice you need Bundler, the Sorbet runtime installed locally, and a `sorbet/config` file in your project. The **Sorbetto: Setup Workspace** command automates setting up a workspace from scratch; see [Setting Up a Workspace](#setting-up-a-workspace) for details. With these pieces in place, the extension can launch the Sorbet [Language Server](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide#why-language-server) and provide the complete feature set.

Sorbetto launches Sorbet in a standard mode by default, but you can configure additional flags or even custom command-lines, however. See the [Sorbet Configuration](#sorbet-configuration) section below for details.

For guidance on how to write typed Ruby, define signatures, and integrate Sorbet into your codebase, refer to the official [Sorbet documentation](https://sorbet.org/docs/overview). It provides a comprehensive overview of the type system, runtime behavior, and recommended workflows for adopting Sorbet effectively.

> **Platform Support**: The extension uses cross-platform practices wherever possible. Compatibility is limited only by the [platforms supported by Sorbet](https://sorbet.org/docs/faq#what-platforms-does-sorbet-support). As a result, Windows-specific codepaths are rarely exercised since Sorbet does not support the platform.

### Setting Up a Workspace
1. Open an existing workspace, or create a new one from an empty folder.
2. Run the **Sorbetto: Setup Workspace** command.
3. Once all Your workspace is ready.

You can [verify](https://sorbet.org/docs/adopting#verify-initialization) the proper structure has been created. If anything looks off or doesn't work, check the installation terminal and the [extension Logs](#extension-logs) for error messages.

> **Multi-root Workspaces**: In multi-root setups, run the setup command **once per workspace folder**. Globally installed tools are detected, but the setup command always installs all required assets locally within each workspace folder.

### Verifying Everything Works

A quick way to confirm that your workspace setup is functioning correctly is to create a small Ruby file and trigger a predictable type error.

1. Create a new file in your workspace, for example:

   **Example:** Broken `example.rb`
   ```ruby
   # typed: strict

   class Demo
     def greet(name)
       "Hello, #{name}"
     end
   end
   ```

2. You should immediately see a diagnostic error similar to:
   ```
   The method 'greet' does not have a 'sig'
   ```
   It will appear as a red wavy underline beneath `def greet(name)` line and as an entry in the **Problems** pane.

3. Add a minimal signature to fix the error, either manually or using the Sorbet‑provided quick fix:

   **Example:** Fixed `example.rb`
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

4. The error should disappear.

[↑ Back to top](#table-of-contents)

## Sorbet Configuration
Use the [Settings Editor](https://code.visualstudio.com/docs/configure/settings#_settings-editor) to modify the configuration values used by the extension.

The most important setting is the **Sorbet Lsp Configuration** which provides the following values:
* **Stable**: runs the Sorbet LSP using `bundle exec srb typecheck`, and any other settings values you might have added.
* **Custom**: runs the Sorbet LSP using a custom command and arguments you provide in the **Sorbet Lsp Custom Configuration** setting.
* **Disabled**: disables Sorbet entirely.

When compared to the official extension, *Beta* and *Experimental* are not configuration modes here but instead settings you can enable separately. Additionally, a limited set of features are exposed as standalone settings, such as **Enable RBS support** and **Enable `require_ancestor` support**. It is expected over time the number of settings will grow. The extension attempts to de-duplicate configuration values whenever they might overlap.

### `sorbet/config`
Support for `sorbet/config` receive editing support with syntax highlighting and limited autocompletion. The extension does not process this file at this point, however, so beware you may create conflicting configurations. For details, see the [Sorbet: Config file](https://sorbet.org/docs/cli#config-file) documentation.

<p align=center>
  <img width="400" alt="sorbet/config with syntax highlighting and autocomplete" src="https://github.com/user-attachments/assets/c32e6603-b116-46d1-af04-826bc155e5b0" />
</p>

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
This extension adds lightweight IDE support for RBS signatures, such as syntax highlighting and simple activation through settings, while language services are provided by Sorbet itself. Check the [official documentation](https://sorbet.org/docs/rbs-support) for details.

* RBS signature comments can be enabled via the **Enable RBS support** setting. This controls whether Sorbet makes use of RBS signatures for typing information.

* Inline RBS signature comments (`#:`) always receive targeted syntax highlighting for Sorbet‑supported constructs, including types, generics, tuples, records, and annotations such as `@abstract`, `@final`, `@sealed`, `@interface`, and `@requires_ancestor`.

In [multi-root workspaces](#multi-root-workspaces), each folder can independently choose whether to use RBS signatures or Sorbet‑generated signatures, allowing mixed setups within a single workspace.

<p align=center>
<img width="332" alt="RBS sig comment highlight" src="https://github.com/user-attachments/assets/e43a8b80-6fb7-40bc-b1af-94d6fbd8f9df" />
</p>

[↑ Back to top](#table-of-contents)

## Workspace Setup
The **Setup Workspace** command automates all steps from [Adopting Sorbet](https://sorbet.org/docs/adopting) in one convenient place. This command configures `bundler` to install gems locally via `bundle config set --local path 'vendor/bundle'`.

> **Note:** Do not use this command if you prefer globally installed gems; instead, follow the linked documentation to set up your workspace.

[↑ Back to top](#table-of-contents)

## Gemfile Tools
If your workspace is not set up for Sorbet, the **Sorbetto: Setup Workspace** creates or updates the `Gemfile` file as necessary. You can then use the **Install** and **Update** CodeLens actions to easily install dependencies using `bundler`. And if you decide to manually uppdate the file, `gem` statements get gem-name autocompletion, queried in real-time from [rubygems.org](https://rubygems.org).

[↑ Back to top](#table-of-contents)

## Extension Logs
Sorbetto uses a single output channel to log both its own exceptions and Sorbet’s. The log level can be controlled via the standard **Developer: Set Log Level** command, selecting **Sorbetto** from the dropdown. See [documentation](https://code.visualstudio.com/updates/v1_73#_setting-log-level-per-output-channel) for details.

[↑ Back to top](#table-of-contents)







