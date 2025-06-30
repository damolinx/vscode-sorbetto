import { ErrorHandler, InitializationFailedHandler, LanguageClientOptions, ResponseError, RevealOutputChannelOn } from 'vscode-languageclient';
import { LanguageClient, ServerOptions } from 'vscode-languageclient/node';
import { SORBET_DOCUMENT_SELECTOR } from './constants';
import { InitializationOptions } from './initializationOptions';
import { SorbetInitializeResult } from './initializeResult';
import { ReadFileRequest } from './readFileRequest';
import { ShowOperationNotification } from './showOperationNotification';
import { ShowSymbolRequest } from './showSymbolRequest';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { WorkspaceDidChangeConfigurationNotification } from './workspaceDidChangeConfigurationNotification';
import { Log } from '../common/log';

/**
 * Create a {@link LanguageClient client} for Sorbet.
 */
export function createClient(
  context: SorbetExtensionContext,
  serverOptions: ServerOptions,
  errorHandler: ErrorHandler,
): SorbetClient {
  const client = new SorbetClient(
    'ruby.sorbet',
    'Sorbet',
    serverOptions,
    {
      documentSelector: SORBET_DOCUMENT_SELECTOR,
      errorHandler,
      initializationFailedHandler: createInitializationFailedHandler(),
      initializationOptions: createInitializationOptions(),
      outputChannel: context.logOutputChannel,
      revealOutputChannelOn: RevealOutputChannelOn.Never,
    },
    context.log);

  return client;

  function createInitializationFailedHandler(): InitializationFailedHandler {
    return (error) => {
      context.log.error('Failed to initialize Sorbet.', error);
      return false;
    };
  }

  function createInitializationOptions()
    : InitializationOptions {
    const { configuration: { highlightUntypedCode, nudgeTypedFalseCompletion } } = context;
    return {
      enableTypedFalseCompletionNudges: nudgeTypedFalseCompletion,
      highlightUntyped: highlightUntypedCode,
      supportsOperationNotifications: true,
      supportsSorbetURIs: true,
    };
  }
}

export class SorbetClient extends LanguageClient implements
  ReadFileRequest,
  ShowOperationNotification,
  ShowSymbolRequest,
  WorkspaceDidChangeConfigurationNotification {

  private readonly log: Log;

  constructor(id: string, name: string, serverOptions: ServerOptions, clientOptions: LanguageClientOptions, log: Log) {
    super(id, name, serverOptions, clientOptions);
    this.log = log;
  }

  override error(message: string, data?: any, _showNotification?: boolean | 'force')
    : void {
    // Primary goal is to override `force` to prevent notifications dialogs
    // from showing up in unintended scenarios (as of Language Client v9).
    // - Sorbet client: couldn't create connection to server.
    //
    // But this override also allows to clean-up logs as the language client
    // tries to insert Date-info and extra spaces. `data2String` is what
    // BaseClientLanguage uses, but does not expose.
    if (data) {
      this.log.error(message, data2String(data).trim());
    } else {
      this.log.error(message);
    }

    function data2String(data: any) {
      if (data instanceof ResponseError) {
        const responseError = data;
        return `Message: ${responseError.message} - Code: ${responseError.code}\n ${responseError.data ? '\n' + responseError.data.toString() : ''}`;
      }
      if (data instanceof Error) {
        if (typeof data.stack === 'string') {
          return data.stack;
        }
        return data.message;
      }
      if (typeof data === 'string') {
        return data;
      }
      return data.toString();
    }
  }

  override get initializeResult(): SorbetInitializeResult | undefined {
    return super.initializeResult as SorbetInitializeResult | undefined;
  }
}