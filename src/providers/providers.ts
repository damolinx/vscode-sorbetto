import { ExtensionContext } from '../extensionContext';
import { registerSorbetCompletionProvider } from './config/sorbetConfigCompletionProvider';
import { registerSorbetConfigHoverProvider } from './config/sorbetConfigHoverProvider';
import { registerGemfileCodeLensProvider } from './gemfile/gemfileCodeLensProvider';
import { registerGemfileCompletionProvider } from './gemfile/gemfileCompletionProvider';
import { registerRequireCompletionProvider } from './ruby/requireCompletionProvider';
import { registerRequireDefinitionProvider } from './ruby/requireDefinitionProvider';
import { registerSelectionRangeProvider } from './ruby/selectionRangeProvider';
import { registerTypedOptionsCompletionProvider } from './ruby/typedOptionsCompletionProvider';
import { registerTypedOptionsHoverProvider } from './ruby/typedOptionsHoverProvider';
import { registerSorbetContentProvider } from './sorbetContentProvider';

export function registerProviders(context: ExtensionContext): void {
  registerGemfileCodeLensProvider(context);
  registerGemfileCompletionProvider(context);
  registerRequireCompletionProvider(context);
  registerRequireDefinitionProvider(context);
  registerSelectionRangeProvider(context);
  registerSorbetCompletionProvider(context);
  registerSorbetConfigHoverProvider(context);
  registerSorbetContentProvider(context);
  registerTypedOptionsCompletionProvider(context);
  registerTypedOptionsHoverProvider(context);
}
