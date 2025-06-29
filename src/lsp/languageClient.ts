import { ErrorHandler, InitializationFailedHandler, RevealOutputChannelOn } from 'vscode-languageclient';
import { LanguageClient, ServerOptions } from 'vscode-languageclient/node';
import { SORBET_DOCUMENT_SELECTOR } from './constants';
import { InitializationOptions } from './initializationOptions';
import { SorbetInitializeResult } from './initializeResult';
import { ReadFileRequest } from './readFileRequest';
import { ShowOperationNotification } from './showOperationNotification';
import { ShowSymbolRequest } from './showSymbolRequest';
import { SorbetExtensionContext } from '../sorbetExtensionContext';
import { WorkspaceDidChangeConfigurationNotification } from './workspaceDidChangeConfigurationNotification';

/**
 * Create a {@link LanguageClient client} for Sorbet.
 */
export function createClient(
  context: SorbetExtensionContext,
  serverOptions: ServerOptions,
  errorHandler: ErrorHandler,
): SorbetClient {
  const client = new SorbetClient
    (
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
      });

  return client;

  function createInitializationFailedHandler(): InitializationFailedHandler {
    return (error) => {
      context.log.error('Failed to initialize Sorbet', error);
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

  override error(message: string, data?: any, showNotification?: boolean | 'force')
    : void {
    // Override `force` to prevent notifications dialogs from showing up in
    // unintended scenarios (still ocurring in LanguageClient v9).
    // - Sorbet client: couldn't create connection to server.
    super.error(
      message,
      data,
      showNotification === 'force' || showNotification,
    );
  }

  override get initializeResult(): SorbetInitializeResult | undefined {
    return super.initializeResult as SorbetInitializeResult | undefined;
  }
}