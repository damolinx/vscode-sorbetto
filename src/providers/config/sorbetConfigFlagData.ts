import * as fs from 'fs';
import { ExtensionContext } from '../../extensionContext';

const SORBET_CONFIG_FLAGS = 'resources/sorbet-config.json';

export interface SorbetConfigFlag {
  argsHint?: string;
  argsValues?: string;
  description: string;
  name: string;
}

export interface SorbetConfigFlagData {
  flags: SorbetConfigFlag[];
}

export function loadFlagData(context: ExtensionContext): SorbetConfigFlagData {
  const path = context.extensionContext.asAbsolutePath(SORBET_CONFIG_FLAGS);
  const content = fs.readFileSync(path, 'utf8');
  const flagData = JSON.parse(content) as SorbetConfigFlagData;
  return flagData;
}
