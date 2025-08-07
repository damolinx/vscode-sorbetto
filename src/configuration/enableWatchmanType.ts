import { Configuration } from './configuration';
import { LspConfiguration } from './lspConfiguration';
import { isAvailable } from '../common/processUtils';

export const DISABLE_WATCHMAN_OPT = '--disable-watchman';

export const enum EnableWatchmanType {
  Auto = 'Auto',
  Enabled = 'Enabled',
  Disabled = 'Disabled',
}

export async function enableWatchmanSupport(lspConfig: LspConfiguration, config: Configuration) {
  switch (config.enableWatchman) {
    case EnableWatchmanType.Auto:
      if (await isAvailable('watchman')) {
        enable();
      } else {
        disable();
      }
      break;
    case EnableWatchmanType.Enabled:
      enable();
      break;
    case EnableWatchmanType.Disabled:
      disable();
      break;
  }

  function enable() {
    if (lspConfig.args.includes(DISABLE_WATCHMAN_OPT)) {
      lspConfig.args = lspConfig.args.filter((arg) => arg === DISABLE_WATCHMAN_OPT);
    }
  }

  function disable() {
    if (!lspConfig.args.includes(DISABLE_WATCHMAN_OPT)) {
      lspConfig.args.push(DISABLE_WATCHMAN_OPT);
    }
  }
}

