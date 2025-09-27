import * as vscode from 'vscode';
import * as vslcn from 'vscode-languageclient/node';
import { Log } from '../common/log';
import { instrumentLanguageClient } from '../common/metrics';
import { ProcessWithExitPromise, spawnWithExitPromise } from '../common/processUtils';
import { InitializationOptions } from '../lsp/initializationOptions';
import { createClient } from '../lsp/languageClient';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { ClientConfiguration } from './configuration/clientConfiguration';
import { createLspConfiguration, LspConfiguration } from './configuration/lspConfiguration';
import { LanguageClientErrorHandler } from './languageClientErrorHandler';
import { LanguageClientMiddleware } from './languageClientMiddleware';

export const LEGACY_RETRY_EXITCODE = 11;

export type InitializeProcessResult = ProcessWithExitPromise & {
  hasExited: boolean;
  exitedWithLegacyRetryCode: boolean;
};

export class LanguageClientCreator {
  private readonly configuration: ClientConfiguration;
  private log: Log;
  private readonly lspClient: vslcn.LanguageClient;
  public lspProcess?: ProcessWithExitPromise;
  private workspaceFolder: vscode.WorkspaceFolder;

  constructor(
    context: SorbetExtensionContext,
    workspaceFolder: vscode.WorkspaceFolder,
    configuration: ClientConfiguration,
  ) {
    this.configuration = configuration;
    this.log = context.log;
    this.workspaceFolder = workspaceFolder;
    this.lspClient = instrumentLanguageClient(
      createClient(
        context,
        this.workspaceFolder,
        {
          errorHandler: new LanguageClientErrorHandler(),
          initializationOptions: this.createInitializationOptions(),
          middleware: new LanguageClientMiddleware(),
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

  private createInitializationOptions(): InitializationOptions | undefined {
    return {
      enableTypedFalseCompletionNudges: this.configuration.isEnabled(
        'typedFalseCompletionNudges',
        true,
      ),
      highlightUntyped: this.configuration.highlightUntypedCode,
      highlightUntypedDiagnosticSeverity: this.configuration.highlightUntypedCodeDiagnosticSeverity,
      supportsOperationNotifications: true,
      supportsSorbetURIs: true,
    };
  }

  public async create(): Promise<{
    client?: vslcn.LanguageClient;
    result: InitializeProcessResult;
  }> {
    await this.lspClient.start();
    const { process } = this.lspProcess!;
    return {
      client: this.lspClient,
      result: {
        ...this.lspProcess!,
        hasExited: process.exitCode !== null,
        exitedWithLegacyRetryCode: process.exitCode === LEGACY_RETRY_EXITCODE,
      },
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
