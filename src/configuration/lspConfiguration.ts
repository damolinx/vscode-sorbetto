import { Configuration } from './configuration';
import { enableWatchmanSupport } from './enableWatchmanType';
import { LspConfigurationType } from './lspConfigurationType';

export interface LspConfiguration {
  args: string[];
  cmd: string;
  env?: Record<string, string>;
  type: LspConfigurationType;
}

export async function buildLspConfiguration(
  config: Configuration,
): Promise<LspConfiguration | undefined> {
  let lspConfig: LspConfiguration | undefined;

  switch (config.lspConfigurationType) {
    case LspConfigurationType.Beta:
      lspConfig = parse(config.sorbetTypecheckCommand, '--lsp', '--enable-all-beta-lsp-features');
      break;
    case LspConfigurationType.Custom:
      lspConfig = parse(config.sorbetLspCustomConfiguration);
      break;
    case LspConfigurationType.Experimental:
      lspConfig = parse(
        config.sorbetTypecheckCommand,
        '--lsp',
        '--enable-all-experimental-lsp-features',
      );
      break;
    case LspConfigurationType.Stable:
      lspConfig = parse(config.sorbetTypecheckCommand, '--lsp');
      break;
    case LspConfigurationType.Disabled:
      lspConfig = undefined;
      break;
    default:
      throw new Error(`Unknown configuration type: ${config.lspConfigurationType}`);
  }

  if (lspConfig) {
    await enableWatchmanSupport(lspConfig, config);
  }

  return lspConfig;

  function parse(cmdLine: string[], ...additionalArgs: string[]): LspConfiguration {
    const [cmd, ...args] = cmdLine;
    if (additionalArgs.length) {
      args.push(...additionalArgs);
    }
    return { cmd, args, type: config.lspConfigurationType };
  }
}
