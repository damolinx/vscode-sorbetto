import { constants } from 'os';
import { ChildProcess, spawn, SpawnOptionsWithoutStdio } from 'child_process';

export const E_COMMAND_NOT_FOUND = 127;
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