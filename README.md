# Sorbetto for VS Code
This extension is a fork of [Sorbet](https://github.com/sorbet/sorbet)'s official [VS Code extension](https://github.com/sorbet/sorbet/tree/master/vscode_extension). It serves as a platform for experimentation and independent development, with goals focused on improving the user experience (UX) and simplifying maintenance.

## Features
  - Automatically verifies on launch whether Sorbet can run (e.g., checks for `bundle`, `srb`).
  - Simplifies workspace setup for Sorbet with the `Verify Workspace` command.
  - Includes snippets for common Sorbet constructs, such as abstract classes, interfaces, generics, and various method templates.
  - Fully, configurable via VS Code Settings.
  - Integrates with the [Language Status Item](https://code.visualstudio.com/api/references/vscode-api#LanguageStatusItem).

Maintainability-wise, changes to dependencies have allowed to:
  - Upgrade the Language Client libraries to the latest version (9.0).
  - Make the aforementioned Language Client package the only shipped dependency, reducing risk.
  - Minify and bundle the extension's `.vsix` for a signficant smaller runtime code.

