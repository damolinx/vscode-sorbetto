import { CancellationToken, Disposable, Event, EventEmitter, workspace } from 'vscode';
import {
  CloseAction,
  CloseHandlerResult,
  ErrorAction,
  ErrorHandler,
  ErrorHandlerResult,
  GenericNotificationHandler,
  LanguageClient,
  ServerCapabilities,
} from 'vscode-languageclient/node';
import { ChildProcess, spawn } from 'child_process';
import { stopProcess } from './connections';
import { createClient } from './languageClient';
import { instrumentLanguageClient } from './languageClient.metrics';
import { SorbetExtensionContext } from './sorbetExtensionContext';
import { ServerStatus, RestartReason } from './types';

const VALID_STATE_TRANSITIONS: ReadonlyMap<
  ServerStatus,
  ReadonlySet<ServerStatus>
> = new Map<ServerStatus, Set<ServerStatus>>([
  [
    ServerStatus.INITIALIZING,
    new Set([
      ServerStatus.ERROR,
      ServerStatus.RESTARTING,
      ServerStatus.RUNNING,
    ]),
  ],
  [
    ServerStatus.RUNNING,
    new Set([ServerStatus.ERROR, ServerStatus.RESTARTING]),
  ],
  [ServerStatus.DISABLED, new Set([ServerStatus.INITIALIZING])],
  // Restarting is a terminal state. The restart occurs by terminating this LanguageClient and creating a new one.
  [ServerStatus.RESTARTING, new Set()],
  // Error is a terminal state for this class.
  [ServerStatus.ERROR, new Set()],
]);

export type SorbetServerCapabilities = ServerCapabilities & {
  sorbetShowSymbolProvider: boolean;
};

interface ErrorInfo {
  msg: string;
  code: string;
}

export class SorbetLanguageClient implements Disposable, ErrorHandler {
  private readonly context: SorbetExtensionContext;
  private readonly languageClient: LanguageClient;
  private readonly onStatusChangeEmitter: EventEmitter<ServerStatus>;
  private readonly restart: (reason: RestartReason) => void;
  // Sometimes this is an errno, not a process exit code. This happens when set
  // via the `.on("error")` handler, instead of the `.on("exit")` handler.
  private sorbetExitCode?: number;
  private sorbetProcess?: ChildProcess;
  private wrappedLastError?: ErrorInfo;
  private wrappedStatus: ServerStatus;

  constructor(
    context: SorbetExtensionContext,
    restart: (reason: RestartReason) => void,
  ) {
    this.context = context;
    this.languageClient = instrumentLanguageClient(
      createClient(context, () => this.startSorbetProcess(), this),
      this.context.metrics,
    );

    this.onStatusChangeEmitter = new EventEmitter();
    this.restart = restart;
    this.wrappedStatus = ServerStatus.INITIALIZING;
  }

  public dispose() {
    this.onStatusChangeEmitter.dispose();

    const aterStop = (tag: string) => {
      this.context.log.info('Stopped Sorbet process', this.sorbetProcess?.pid, tag);
      this.context.metrics.increment('stop.success', 1);
      this.sorbetProcess = undefined;
    };

    this.languageClient.stop().then(() => {
      // Forcefully stopping the Sorbet process as in some scenarios it might
      // still be running (give 5s)
      // TODO: This might be a legacy or large project requirement as in test
      // cases Sorbet process is already stopped by the time this code is hit.
      if (this.sorbetProcess && this.sorbetProcess.exitCode) {
        setTimeout(() => {
          if (this.sorbetProcess && (typeof this.sorbetProcess.exitCode !== 'number')) {
            stopProcess(this.sorbetProcess!, this.context.log)
              .then(() => aterStop('(force)'))
              .catch((err) => this.context.log.error('Failed to stop Sorbet process', err));
          } else {
            aterStop('(slow)');
          }
        }, 5000);
      } else {
        aterStop('');
      }
    });
  }

  /**
   * Sorbet language server {@link SorbetServerCapabilities capabilities}. Only
   * available when the server has been initialized.
   */
  public get capabilities(): SorbetServerCapabilities | undefined {
    return this.languageClient.initializeResult?.capabilities as SorbetServerCapabilities | undefined;
  }

  /**
   * Last error message when {@link status} is {@link ServerStatus.ERROR}.
   */
  public get lastError(): ErrorInfo | undefined {
    return this.wrappedLastError;
  }

  /**
   * Resolves when client is ready to serve requests.
   */
  public async start(): Promise<void> {
    if (!this.languageClient.needsStart()) {
      this.context.log.debug('Ignored unnecessary start request');
      return;
    }

    this.status = ServerStatus.INITIALIZING;
    await this.languageClient.start();

    // In case of error (missing Sorbet process), the client might have already
    // transitioned to Error or Restarting so this should not override that.
    if (this.status === ServerStatus.INITIALIZING) {
      this.status = ServerStatus.RUNNING;
    }
  }

  /**
   * Register a handler for a language server notification. See {@link LanguageClient.onNotification}.
   */
  public onNotification(
    method: string,
    handler: GenericNotificationHandler,
  ): Disposable {
    return this.languageClient.onNotification(method, handler);
  }

  /**
   * Event fired on {@link status} changes.
   */
  public get onStatusChange(): Event<ServerStatus> {
    return this.onStatusChangeEmitter.event;
  }

  /**
   * Send a request to language server. See {@link LanguageClient.sendRequest}.
   */
  public sendRequest<TResponse>(
    method: string,
    param: any,
    token?: CancellationToken,
  ): Promise<TResponse | null | undefined> {
    return this.languageClient.sendRequest<TResponse>(method, param, token);
  }

  /**
   * Send a notification to language server. See {@link LanguageClient.sendNotification}.
   */
  public sendNotification(method: string, param: any): void {
    this.languageClient.sendNotification(method, param);
  }

  /**
   * Language client status.
   */
  public get status(): ServerStatus {
    return this.wrappedStatus;
  }

  private set status(newStatus: ServerStatus) {
    if (this.status === newStatus) {
      return;
    }

    if (!VALID_STATE_TRANSITIONS.get(this.status)?.has(newStatus)) {
      this.context.log.error(
        `Invalid Sorbet server transition: ${this.status} => ${newStatus}}`,
      );
    }

    this.wrappedStatus = newStatus;
    this.onStatusChangeEmitter.fire(newStatus);
  }

  /**
   * Runs a Sorbet process using the current active configuration. Debounced so that it runs
   * Sorbet at most every MIN_TIME_BETWEEN_RETRIES_MS.
   */
  private startSorbetProcess(): Promise<ChildProcess> {
    this.context.log.info('Running Sorbet LSP.');
    const activeConfig = this.context.configuration.lspConfig;
    const [command, ...args] = activeConfig?.command ?? [];
    if (!command) {
      let msg: string;
      if (!activeConfig) {
        msg = 'No active Sorbet configuration.';
        this.status = ServerStatus.DISABLED;
      } else {
        msg = `Missing command-line data to start Sorbet. Config:${activeConfig.type}`;
      }
      return Promise.reject(msg);
    }

    this.context.log.debug('>', command, ...args);
    this.sorbetProcess = spawn(command, args, {
      cwd: workspace.rootPath,
      env: { ...process.env, ...activeConfig?.env },
    });
    this.sorbetProcess.on(
      'exit',
      (code: number | null, _signal: string | null) => {
        this.sorbetExitCode = code ?? undefined;
      },
    ).on('error', (err?: NodeJS.ErrnoException) => {
      this.sorbetExitCode = err?.errno;
      this.sorbetProcess = undefined;
      if (err?.code === 'ENOENT' && this.status === ServerStatus.INITIALIZING) {
        this.context.metrics.increment('error.enoent', 1);
        this.wrappedLastError =
        {
          code: err.code,
          msg: `Failed to start Sorbet: ${err.message}`,
        };
        this.status = ServerStatus.ERROR;
      }
    });
    return Promise.resolve(this.sorbetProcess);
  }

  /** ErrorHandler interface */

  public error(): ErrorHandlerResult {
    if (this.status !== ServerStatus.ERROR) {
      this.status = ServerStatus.RESTARTING;
      this.restart(RestartReason.CRASH_LC_ERROR);
    }
    return {
      action: ErrorAction.Shutdown,
    };
  }

  public closed(): CloseHandlerResult {
    if (this.status !== ServerStatus.ERROR) {
      let reason: RestartReason;
      if (this.sorbetExitCode === 11) {
        // 11 number chosen somewhat arbitrarily. Most important is that this doesn't
        // clobber the exit code of Sorbet itself (which means Sorbet cannot return 11).
        //
        // The only thing that matters is that this value is kept in sync with any
        // wrapper scripts that people use with Sorbet. If this number has to
        // change for some reason, we should announce that.
        reason = RestartReason.WRAPPER_REFUSED_SPAWN;
      } else if (this.sorbetExitCode === 143) {
        // 143 = 128 + 15 and 15 is TERM signal
        reason = RestartReason.FORCIBLY_TERMINATED;
      } else {
        reason = RestartReason.CRASH_LC_CLOSED;
        this.context.log.error(
          'The Sorbet LSP process crashed exit_code',
          this.sorbetExitCode,
        );
        this.context.log.error(
          'The Node.js backtrace above is not useful.',
          'If there is a C++ backtrace above, that is useful.',
          'Otherwise, more useful output will be in the --debug-log-file to the Sorbet process',
          '(if provided as a command-line argument).',
        );
      }

      this.status = ServerStatus.RESTARTING;
      this.restart(reason);
    }

    return {
      action: CloseAction.DoNotRestart,
    };
  }
}
