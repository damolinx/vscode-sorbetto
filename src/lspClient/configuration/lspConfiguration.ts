import { ClientConfiguration } from './clientConfiguration';
import { enableWatchmanSupport } from './enableWatchmanType';
import { LspConfigurationType } from './lspConfigurationType';

export interface LspConfiguration {
  args: string[];
  cmd: string;
  env?: Record<string, string>;
  type: LspConfigurationType;
}

/**
 * Creates a new {@link LspConfiguration} from the given {@link ClientConfiguration configuration}.
 * @returns A configuration instance, or `undefined` if the LSP is disabled.
 */
export async function createLspConfiguration(
  configuration: ClientConfiguration,
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
}
