import { isAvailable } from '../../common/processUtils';
import { EnableWatchmanType } from './enableWatchmanType';
import { LspConfigurationType } from './lspConfigurationType';
import { SorbetClientConfiguration } from './sorbetClientConfiguration';

export interface LspConfiguration {
  args: string[];
  cmd: string;
  env?: Record<string, string>;
  type: LspConfigurationType;
}

/**
 * Creates a {@link LspConfiguration LSP configuration} from the given {@link SorbetClientConfiguration client configuration}.
 * @returns A  {@link LspConfiguration} instance, or `undefined` if the LSP is disabled.
 */
export async function createLspConfiguration(
  configuration: SorbetClientConfiguration,
): Promise<LspConfiguration | undefined> {
  let lspConfig: LspConfiguration | undefined;

  switch (configuration.lspConfigurationType) {
    case LspConfigurationType.Custom:
      lspConfig = parse(
        configuration.lspConfigurationType,
        configuration.sorbetLspCustomConfiguration,
      );
      break;
    case LspConfigurationType.Stable:
      lspConfig = parse(
        configuration.lspConfigurationType,
        configuration.sorbetTypecheckCommand,
        '--lsp',
      );
      break;
    case LspConfigurationType.Disabled:
      lspConfig = undefined;
      break;
    default:
      throw new Error(`Unknown configuration type: ${configuration.lspConfigurationType}`);
  }

  if (lspConfig) {
    if (configuration.isEnabled('enableAllBetaFeatures')) {
      lspConfig.args.push('--enable-all-beta-lsp-features');
    }

    if (configuration.isEnabled('enableAllExperimentalFeatures')) {
      lspConfig.args.push('--enable-all-experimental-lsp-features');
    } else {
      if (configuration.isEnabled('enableRbsSupport')) {
        lspConfig.args.push('--enable-experimental-rbs-comments');
      }
      if (configuration.isEnabled('enableRequiresAncestor')) {
        lspConfig.args.push('--enable-experimental-requires-ancestor');
      }
    }

    await enableWatchmanSupport(lspConfig, configuration);
  }

  return lspConfig;

  function parse(
    type: LspConfigurationType,
    cmdLine: string[],
    ...additionalArgs: string[]
  ): LspConfiguration {
    const [cmd, ...args] = cmdLine;
    if (additionalArgs.length) {
      args.push(...additionalArgs);
    }
    if (cmd === undefined) {
      throw new Error(`Missing LSP command for '${type}' configuration.`);
    }
    return { cmd, args, type: configuration.lspConfigurationType };
  }

  async function enableWatchmanSupport(
    lspConfig: LspConfiguration,
    config: SorbetClientConfiguration,
  ) {
    const DISABLE_WATCHMAN_OPT = '--disable-watchman';

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
}
