# Sorbetto for VS Code
Sorbetto is a Visual Studio Code extension that provides Ruby language support using [Sorbet](https://github.com/sorbet/sorbet), a static type checker for Ruby. It is a fork of the official [extension](https://github.com/sorbet/sorbet/tree/master/vscode_extension), focusing on *user experience* (UX) and *maintainability* improvements.

## Features
- Uses the [Language Status Item](https://code.visualstudio.com/api/references/vscode-api#LanguageStatusItem), the standard method for relaying language-related status information in VSCode. This replaces the `Sorbet` status bar item for a more consistent experience.
- Provides a collection of snippets for Sorbet constructs to make common patterns easier to insert and speed up development.
- Performs automatic dependency checks (e.g., `bundle`, `srb`) and streamlines workspace setup, ensuring a smoother startup experience.

## Maintainability Updates
- Minimum VSCode version updated to 1.77, allowing use of more recent extensibility APIs.
- Language Client library updated to version 9.0.
- Shipped dependencies limited to Language Client library, reducing complexity and risk.
- Migrating to `esbuild` enables minification and bundling, resulting in a significantly smaller runtime code footprint.

