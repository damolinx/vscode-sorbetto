import { ExtensionContext } from '../extensionContext';
import { registerSorbetCompletionProvider } from './config/sorbetConfigCompletionProvider';
import { loadFlagData } from './config/sorbetConfigFlagData';
import { registerSorbetConfigHoverProvider } from './config/sorbetConfigHoverProvider';
import { registerGemfileCodeLensProvider } from './gemfile/gemfileCodeLensProvider';
import { registerGemfileCompletionProvider } from './gemfile/gemfileCompletionProvider';
import { registerRequireCompletionProvider } from './ruby/requireCompletionProvider';
import { registerRequireDefinitionProvider } from './ruby/requireDefinitionProvider';
import { registerSelectionRangeProvider } from './ruby/selectionRangeProvider';
import { registerTypedOptionsCompletionProvider } from './ruby/typedOptionsCompletionProvider';
import { registerSorbetContentProvider } from './sorbetContentProvider';

export function registerProviders(context: ExtensionContext): void {
  registerGemfileCodeLensProvider(context);
  registerGemfileCompletionProvider(context);
  registerRequireCompletionProvider(context);
  registerRequireDefinitionProvider(context);
  registerSelectionRangeProvider(context);
  registerSorbetContentProvider(context);
  registerTypedOptionsCompletionProvider(context);

  const flagData = loadFlagData(context);
  registerSorbetCompletionProvider(context, flagData);
  registerSorbetConfigHoverProvider(context, flagData);
}
