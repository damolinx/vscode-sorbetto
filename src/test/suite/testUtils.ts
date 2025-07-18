import { LogLevel } from 'vscode';
import { Log } from '../../common/log';

/**
 * Stub {@link Log} interface.
 * @param level Default log-level.
 */
export function createLogStub(level = LogLevel.Error): Log {
  return {
    debug: () => { },
    error: () => { },
    info: () => { },
    trace: () => { },
    warn: () => { },
    logLevel: level,
  };
}
