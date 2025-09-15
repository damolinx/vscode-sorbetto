import * as vscode from 'vscode';
import * as vslc from 'vscode-languageclient/node';
import { Log } from './common/log';
import { instrumentLanguageClient } from './common/metrics';
import { ProcessWithExitPromise, spawnWithExitPromise } from './common/processUtils';
import { LspConfiguration } from './configuration/lspConfiguration';
import { SorbetLanguageClient, createClient } from './lsp/languageClient';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { SorbetMiddleware } from './sorbetMiddleware';

export const LEGACY_RETRY_EXITCODE = 11;

export type InitializeProcessResult = ProcessWithExitPromise & {
  hasExited: boolean;
  exitedWithLegacyRetryCode: boolean;
};

export class LanguageClientInitializer {
  private log: Log;
  public readonly lspClient: SorbetLanguageClient;
  public lspProcess?: ProcessWithExitPromise;
  private workspaceFolder: vscode.WorkspaceFolder;

  constructor(
    context: SorbetExtensionContext,
    workspaceFolder: vscode.WorkspaceFolder,
    configuration: LspConfiguration,
  ) {
    this.log = context.log;
    this.workspaceFolder = workspaceFolder;
    this.lspClient = instrumentLanguageClient(
      createClient(
        context,
        this.workspaceFolder,
        async () => {
          this.lspProcess = await this.startLspClient(configuration);
          return this.lspProcess.process;
        },
        {
          closed: () => ({
            action: vslc.CloseAction.DoNotRestart,
            handled: true,
          }),
          error: () => ({
            action: vslc.ErrorAction.Shutdown,
            handled: true,
          }),
        } as vslc.ErrorHandler,
        new SorbetMiddleware(),
      ),
      context.metrics,
    );
  }

  public async initialize(): Promise<InitializeProcessResult> {
    await this.lspClient.start();
    const { process } = this.lspProcess!;
    return {
      ...this.lspProcess!,
      hasExited: process.exitCode !== null,
      exitedWithLegacyRetryCode: process.exitCode === LEGACY_RETRY_EXITCODE,
    };
  }

  private async startLspClient(configuration: LspConfiguration): Promise<ProcessWithExitPromise> {
    this.log.info('Start Sorbet LSP', this.workspaceFolder.uri.toString());
    this.log.info('>', configuration.cmd, ...configuration.args);

    const lspProcess = spawnWithExitPromise(configuration.cmd, configuration.args, {
      cwd: this.workspaceFolder.uri.fsPath,
      env: { ...process.env, ...configuration.env },
    });

    const { process: childProcess } = lspProcess;
    if (childProcess.pid !== undefined) {
      this.log.info('> pid', childProcess.pid);
    }

    lspProcess.exit = lspProcess.exit.then((errorInfo) => {
      if (errorInfo) {
        this.log.debug('Sorbet LSP process failed.', errorInfo?.pid ?? '«no pid»', errorInfo);
      } else {
        this.log.debug(
          'Sorbet LSP process exited.',
          childProcess.pid ?? '«no pid»',
          childProcess.exitCode,
        );
      }
      return errorInfo;
    });

    return lspProcess;
  }
}
