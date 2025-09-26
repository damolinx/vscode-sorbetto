import { ClientConfiguration } from './clientConfiguration';
import { enableWatchmanSupport } from './enableWatchmanType';
import { LspConfigurationType } from './lspConfigurationType';

export interface LspConfiguration {
  args: string[];
  cmd: string;
  env?: Record<string, string>;
  type: LspConfigurationType;
}

export async function buildLspConfiguration(
  config: ClientConfiguration,
): Promise<LspConfiguration | undefined> {
  let lspConfig: LspConfiguration | undefined;

  switch (config.lspConfigurationType) {
    case LspConfigurationType.Custom:
      lspConfig = parse(config.lspConfigurationType, config.sorbetLspCustomConfiguration);
      break;
    case LspConfigurationType.Stable:
      lspConfig = parse(config.lspConfigurationType, config.sorbetTypecheckCommand, '--lsp');
      break;
    case LspConfigurationType.Disabled:
      lspConfig = undefined;
      break;
    default:
      throw new Error(`Unknown configuration type: ${config.lspConfigurationType}`);
  }

  if (lspConfig) {
    if (config.enableAllBetaFeatures) {
      lspConfig.args.push('--enable-all-beta-lsp-features');
    }

    if (config.enableAllExperimentalFeatures) {
      lspConfig.args.push('--enable-all-experimental-lsp-features');
    } else {
      if (config.enableRbsSupport) {
        lspConfig.args.push('--enable-experimental-rbs-comments');
      }
      if (config.enableRequiresAncestor) {
        lspConfig.args.push('--enable-experimental-requires-ancestor');
      }
    }

    await enableWatchmanSupport(lspConfig, config);
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
    return { cmd, args, type: config.lspConfigurationType };
  }
}
