import { Configuration } from './configuration';
import { LspConfigurationType } from './lspConfigurationType';

export interface LspConfiguration {
  args: string[];
  cmd: string;
  env?: Record<string, string>;
  type: LspConfigurationType;
}

export function buildLspConfiguration(config: Configuration): LspConfiguration | undefined {
  const { lspConfigurationType: type } = config;
  switch (type) {
    case LspConfigurationType.Beta:
      return parse(config.sorbetLspBaseConfiguration, '--enable-all-beta-lsp-features');
    case LspConfigurationType.Custom:
      return parse(config.sorbetLspCustomConfiguration);
    case LspConfigurationType.Experimental:
      return parse(config.sorbetLspBaseConfiguration, '--enable-all-experimental-lsp-features');
    case LspConfigurationType.Stable:
      return parse(config.sorbetLspBaseConfiguration);
    case LspConfigurationType.Disabled:
      return undefined;
    default:
      throw new Error(`Unknown configuration type: ${type}`);
  }

  function parse(cmdLine: string[], ...additionalArgs: string[]): LspConfiguration {
    const [cmd, ...args] = cmdLine;
    if (additionalArgs.length) {
      args.push(...additionalArgs);
    }
    return { cmd, args, type: config.lspConfigurationType };
  }
}