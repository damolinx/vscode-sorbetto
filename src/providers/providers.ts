import { ExtensionContext } from '../extensionContext';
import { registerSorbetConfigProviders } from './config/sorbetConfigProviders';
import { registerGemfileProviders } from './gemfile/gemfileProviders';
import { registerRequireCompletionProvider } from './ruby/requireCompletionProvider';
import { registerRequireDefinitionProvider } from './ruby/requireDefinitionProvider';
import { registerSelectionRangeProvider } from './ruby/selectionRangeProvider';
import { registerTypedOptionsCompletionProvider } from './ruby/typedOptionsCompletionProvider';
import { registerSorbetContentProvider } from './sorbetContentProvider';

export function registerProviders(context: ExtensionContext): void {
  registerGemfileProviders(context);
  registerRequireCompletionProvider(context);
  registerRequireDefinitionProvider(context);
  registerSelectionRangeProvider(context);
  registerSorbetConfigProviders(context);
  registerSorbetContentProvider(context);
  registerTypedOptionsCompletionProvider(context);
}
