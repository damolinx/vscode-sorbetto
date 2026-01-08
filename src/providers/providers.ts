import { ExtensionContext } from '../extensionContext';
import { registerSorbetConfigProviders } from './config/sorbetConfigProviders';
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
  registerSorbetConfigProviders(context);
  registerSorbetContentProvider(context);
  registerTypedOptionsCompletionProvider(context);
}
