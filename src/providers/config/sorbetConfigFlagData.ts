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

let cachedFlags: Map<string, SorbetConfigFlag> | undefined;
export async function getFlags(context: ExtensionContext): Promise<Map<string, SorbetConfigFlag>> {
  if (!cachedFlags) {
    const path = context.extensionContext.asAbsolutePath(SORBET_CONFIG_FLAGS);
    const content = await fs.promises.readFile(path, { encoding: 'utf8' });
    const rawData = JSON.parse(content) as SorbetConfigFlags;
    cachedFlags = new Map(rawData.flags.map((f) => [f.name, f]));
  }

  return cachedFlags;
}

export async function getFlag(
  context: ExtensionContext,
  flagName: string,
): Promise<SorbetConfigFlag | undefined> {
  const flags = await getFlags(context);
  return flags.get(flagName);
}
