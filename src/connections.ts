import { ChildProcess } from 'child_process';
import { Log } from './common/log';

/**
 * Attempts to stop the given child process, allowing to configure
 * progressive signales and a delay between them.
 */
export async function stopProcess(p: ChildProcess, log: Log, delayMS = 1000, signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGKILL']) {
  let exited = false;
  if (typeof p.exitCode === 'number') {
    log.debug('Process has already exited', p.pid, p.exitCode);
    return;
  }

  p.on('close', (code, signal) => {
    log.debug('Process stopped', p.pid, code, signal);
    exited = true;
  });

  for (const signal of signals) {
    log.debug('Attempting to stop the process', p.pid, signal);
    if (p.kill(signal)) {
      await new Promise((resolve) => setTimeout(resolve, delayMS));
      if (exited) {
        log.debug('Process has exited', p.pid, signal);
        break;
      }
    } else {
      log.debug('Failed to send kill signal', p.pid, signal);
    }
  }
  if (!exited) {
    log.warn('Failed to stop process', p.pid);
  }
}