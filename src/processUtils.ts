import { constants } from 'os';
import { ChildProcess, spawn, SpawnOptionsWithoutStdio } from 'child_process';
import { Log } from './common/log';

export const E_COMMAND_NOT_FOUND = 127;
export const E_SIGINT = 128 + constants.signals.SIGINT;
export const E_SIGKILL = 128 + constants.signals.SIGKILL;
export const E_SIGTERM = 128 + constants.signals.SIGTERM;

export interface ErrorInfo {
  code?: string;
  errno?: number;
  message?: string;
  pid?: number;
}

export interface ProcessWithExitPromise {
  exit: Promise<ErrorInfo | undefined>;
  process: ChildProcess;
}

export function spawnWithExitPromise(
  command: string,
  args?: readonly string[],
  options?: SpawnOptionsWithoutStdio): ProcessWithExitPromise {
  const childProcess = spawn(command, args, options);
  const exitPromise = new Promise<ErrorInfo | undefined>((resolve) => {
    childProcess.on('error',
      (err?: NodeJS.ErrnoException) => {
        resolve({
          code: err?.code,
          errno: err?.errno,
          message: err?.message,
          pid: childProcess.pid,
        });
      }).on('exit', (code: number | null, signal: string | null) => {
        resolve(code === 0
          ? undefined
          : {
            errno: code ?? undefined,
            message: signal ?? undefined,
            pid: childProcess.pid,
          });
      });
  });
  return { process: childProcess, exit: exitPromise };
}

/**
 * Attempts to stop the given child process, allowing to configure
 * progressive signales and a delay between them.
 */
export async function stopProcess(p: ChildProcess, log: Log, delayMS = 1000, signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGKILL']) {
  let exited = false;
  if (typeof p.exitCode === 'number') {
    log.debug('Process has already exited.', p.pid, p.exitCode);
    return;
  }

  p.on('close', (code, signal) => {
    log.debug('Process stopped.', p.pid, code, signal);
    exited = true;
  });

  for (const signal of signals) {
    log.debug('Attempting to stop the process.', p.pid, signal);
    if (p.kill(signal)) {
      await new Promise((resolve) => setTimeout(resolve, delayMS));
      if (exited) {
        log.debug('Process has exited.', p.pid, signal);
        break;
      }
    } else {
      log.debug('Failed to send kill signal.', p.pid, signal);
    }
  }
  if (!exited) {
    log.warn('Failed to stop process.', p.pid);
  }
}
