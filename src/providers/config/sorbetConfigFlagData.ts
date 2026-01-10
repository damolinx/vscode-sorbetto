import * as fs from 'fs';
import { ExtensionContext } from '../../extensionContext';

const SORBET_CONFIG_FLAGS = 'resources/sorbet-config.json';

export interface SorbetConfigFlag {
  argsHint?: string;
  argsValues?: string;
  description: string;
  name: string;
}

export interface SorbetConfigFlags {
  flags: SorbetConfigFlag[];
}

let flags: Map<string, SorbetConfigFlag> | undefined;
export async function getFlags(context: ExtensionContext): Promise<Map<string, SorbetConfigFlag>> {
  if (!flags) {
    const path = context.extensionContext.asAbsolutePath(SORBET_CONFIG_FLAGS);
    const content = await fs.promises.readFile(path, { encoding: 'utf8' });
    const rawData = JSON.parse(content) as SorbetConfigFlags;
    flags = new Map(rawData.flags.map((f) => [f.name, f]));
  }

  return flags;
}

export async function getFlag(
  context: ExtensionContext,
  flagName: string,
): Promise<SorbetConfigFlag | undefined> {
  const flags = await getFlags(context);
  return flags.get(flagName);
}
