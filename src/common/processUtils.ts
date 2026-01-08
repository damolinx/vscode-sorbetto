import { ChildProcess, exec, spawn, SpawnOptionsWithoutStdio } from 'child_process';
import { constants } from 'os';

export const E_COMMAND_NOT_FOUND = 127;
export const E_SIGKILL = 128 + constants.signals.SIGKILL;
export const E_SIGTERM = 128 + constants.signals.SIGTERM;

export interface ErrorInfo {
  code?: string;
  errno?: number;
  message?: string;
}

export interface ProcessWithExitPromise {
  exit: Promise<ErrorInfo | undefined>;
  kill: (signa?: NodeJS.Signals | number) => boolean;
  process: ChildProcess;
}

export function spawnWithExitPromise(
  command: string,
  args?: readonly string[],
  options?: SpawnOptionsWithoutStdio,
): ProcessWithExitPromise {
  const childProcess = spawn(command, args, options);
  const exitPromise = new Promise<ErrorInfo | undefined>((resolve) => {
    childProcess
      .on('error', (err?: NodeJS.ErrnoException) => {
        resolve({
          code: err?.code,
          errno: err?.errno,
          message: err?.message,
        });
      })
      .on('exit', (code: number | null, signal: string | null) => {
        resolve(
          code === 0
            ? undefined
            : {
                errno: code ?? undefined,
                message: signal ?? undefined,
              },
        );
      });
  });
  return {
    exit: exitPromise,
    kill: (signal: NodeJS.Signals | number = constants.signals.SIGKILL) =>
      childProcess.kill(signal),
    process: childProcess,
  };
}

export async function isAvailable(command: string, cwd?: string): Promise<boolean> {
  const whereOrWhich = process.platform === 'win32' ? 'where' : 'which';
  return new Promise((resolve, _reject) =>
    exec(`${whereOrWhich} ${command}`, { cwd }, (error) => resolve(error ? false : true)),
  );
}
