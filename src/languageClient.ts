import { DocumentFilter, ErrorHandler, RevealOutputChannelOn } from 'vscode-languageclient';
import { LanguageClient, ServerOptions } from 'vscode-languageclient/node';
import { HighlightType } from './configuration';
import { Log } from './log';
import { SorbetExtensionContext } from './sorbetExtensionContext';

export const SORBET_DOCUMENT_SELECTOR: DocumentFilter[] = [
  { language: 'ruby', scheme: 'file' },
  // Support queries on generated files with sorbet:// URIs that do not exist editor-side.
  { language: 'ruby', scheme: 'sorbet' },
];

/**
 * Create Language Client for Sorber Server.
 */
export function createClient(
  context: SorbetExtensionContext,
  serverOptions: ServerOptions,
  errorHandler: ErrorHandler,
): LanguageClient {
  const initializationOptions = {
    // Opt in to sorbet/showOperation notifications.
    supportsOperationNotifications: true,
    // Let Sorbet know that we can handle sorbet:// URIs for generated files.
    supportsSorbetURIs: true,
    highlightUntyped: getHighlightType(context.configuration.highlightUntyped, context.log),
    enableTypedFalseCompletionNudges:
      context.configuration.typedFalseCompletionNudges,
  };

  context.log.debug(
    'Initializing with initializationOptions',
    ...Object.entries(initializationOptions).map(([k, v]) => `${k}:${v}`),
  );

  const client = new CustomLanguageClient('ruby', 'Sorbet', serverOptions, {
    documentSelector: SORBET_DOCUMENT_SELECTOR,
    errorHandler,
    initializationOptions,
    initializationFailedHandler: (error) => {
      context.log.error(
        'Failed to initialize Sorbet language server.',
        error instanceof Error ? error : undefined,
      );
      return false;
    },
    outputChannel: context.logOutputChannel,
    revealOutputChannelOn: context.configuration.revealOutputOnError
      ? RevealOutputChannelOn.Error
      : RevealOutputChannelOn.Never,
  });

  return client;
}

export function getHighlightType(type: HighlightType, log: Log): boolean | HighlightType {
  switch (type) {
    case HighlightType.Disabled:
      return false;
    case HighlightType.Everywhere:
      return true;
    case HighlightType.EverywhereButTests:
      return type;
    default:
      log.warn('Got unexpected state', type);
      return false;
  }
}

// This implementation exists for the sole purpose of overriding the `force` flag
// as the error/closed/init handlers are not used in every case. In particular, if
// the server fails to start, errors are shown as dialog notification, with errors
// similar to:
//
// - Sorbet client: couldn't create connection to server.
// - Connection to server got closed. Server will not be restarted.
//
// By not forcing a UI component, they are just routed to existing loggers.
class CustomLanguageClient extends LanguageClient {
  error(
    message: string,
    data?: any,
    showNotification?: boolean | 'force',
  ): void {
    super.error(
      message,
      data,
      showNotification === 'force' ? true : showNotification,
    );
  }
}
