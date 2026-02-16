import * as vscode from 'vscode';
import { SorbetClient } from '../client/sorbetClient';
import { createClient } from '../client/sorbetClientFactory';
import { instrumentLanguageClient } from '../common/metrics';
import { ProcessWithExitPromise, spawnWithExitPromise } from '../common/processUtils';
import { ExtensionContext } from '../extensionContext';
import { createLspConfiguration, LspConfiguration } from './configuration/lspConfiguration';
import { SorbetClientConfiguration } from './configuration/sorbetClientConfiguration';
import { LanguageClientErrorHandler } from './languageClientErrorHandler';

export const LEGACY_RETRY_EXITCODE = 11;

export type InitializeProcessResult = ProcessWithExitPromise & {
  hasExited: boolean;
  exitedWithLegacyRetryCode: boolean;
};

export class LanguageClientCreator {
  private readonly lspClient: SorbetClient;
  public lspProcess?: ProcessWithExitPromise;

  constructor(
    private readonly context: ExtensionContext,
    private readonly workspaceFolder: vscode.WorkspaceFolder,
    private readonly configuration: SorbetClientConfiguration,
    outputChannel: vscode.LogOutputChannel,
  ) {
    this.workspaceFolder = workspaceFolder;
    this.lspClient = instrumentLanguageClient(
      createClient(
        {
          errorHandler: new LanguageClientErrorHandler(),
          initializationOptions: configuration.toInitializationOptions(),
          outputChannel,
          workspaceFolder: this.workspaceFolder,
        },
        async () => {
          const lspConfiguration = await createLspConfiguration(this.configuration);
          if (!lspConfiguration) {
            throw new Error('Missing start configuration');
          }

          this.lspProcess = await this.startLspClient(lspConfiguration);
          return this.lspProcess.process;
        },
      ),
      context.metrics,
    );
  }

  public async create(): Promise<{
    client?: SorbetClient;
    result: InitializeProcessResult;
  }> {
    await this.lspClient.start();
    const { process } = this.lspProcess!;
    return {
      client: this.lspClient,
      result: {
        ...this.lspProcess!,
        hasExited: process.exitCode !== null || process.signalCode !== null,
        exitedWithLegacyRetryCode: process.exitCode === LEGACY_RETRY_EXITCODE,
      },
    };
  }

  private async startLspClient(configuration: LspConfiguration): Promise<ProcessWithExitPromise> {
    this.context.log.info('Start Sorbet LSP', this.workspaceFolder.uri.toString(true));
    this.context.log.info('>', configuration.cmd, ...configuration.args);

    const lspProcess = spawnWithExitPromise(configuration.cmd, configuration.args, {
      cwd: this.workspaceFolder.uri.fsPath,
      env: { ...process.env, ...configuration.env },
    });

    const { process: childProcess } = lspProcess;
    if (childProcess.pid !== undefined) {
      this.context.log.info('> pid', childProcess.pid);
    }

    lspProcess.exit = lspProcess.exit.then((errorInfo) => {
      const pid = childProcess.pid ?? '«no pid»';
      if (errorInfo) {
        this.context.log.debug('Sorbet LSP process failed.', pid, errorInfo);
      } else {
        const exitCode = childProcess.exitCode ?? '«no exitCode»';
        this.context.log.debug('Sorbet LSP process exited.', pid, exitCode);
      }
      return errorInfo;
    });

    return lspProcess;
  }
}
