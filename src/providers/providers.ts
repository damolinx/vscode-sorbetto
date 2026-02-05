import { ExtensionContext } from '../extensionContext';
import { registerSorbetCompletionProvider } from './config/sorbetConfigCompletionProvider';
import { registerSorbetConfigHoverProvider } from './config/sorbetConfigHoverProvider';
import { registerGemfileCodeLensProvider } from './gemfile/gemfileCodeLensProvider';
import { registerGemfileCompletionProvider } from './gemfile/gemfileCompletionProvider';
import { registerFoldingRangeProvider } from './ruby/foldingRangeProvider';
import { registerRequireRelativeCompletionProvider } from './ruby/requireRelativeCompletionProvider';
import { registerRequireRelativeDefinitionProvider } from './ruby/requireRelativeDefinitionProvider';
import { registerSelectionRangeProvider } from './ruby/selectionRangeProvider';
import { registerTypedOptionsCompletionProvider } from './ruby/typedOptionsCompletionProvider';
import { registerTypedOptionsHoverProvider } from './ruby/typedOptionsHoverProvider';
import { registerSorbetContentProvider } from './sorbetContentProvider';

export function registerProviders(context: ExtensionContext): void {
  registerFoldingRangeProvider(context);
  registerGemfileCodeLensProvider(context);
  registerGemfileCompletionProvider(context);
  registerRequireRelativeCompletionProvider(context);
  registerRequireRelativeDefinitionProvider(context);
  registerSelectionRangeProvider(context);
  registerSorbetCompletionProvider(context);
  registerSorbetConfigHoverProvider(context);
  registerSorbetContentProvider(context);
  registerTypedOptionsCompletionProvider(context);
  registerTypedOptionsHoverProvider(context);
}
