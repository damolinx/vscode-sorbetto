export type RubyTypedDirective = 'ignore' | 'false' | 'true' | 'strict' | 'strong';

/**
 * Only scan the top N lines for comment directives for performance.
 */
export const HEADER_LINES_WINDOW = 10;

export const RUBY_TYPED_DIRECTIVES_HELP: Record<RubyTypedDirective, string> = {
  ignore: 'This file is not typechecked.',
  false: 'This file is parsed, but typechecking is disabled.',
  true: 'This file is typechecked with basic rules; signatures are optional.',
  strict: 'This file is fully typechecked; method signatures are required.',
  strong: 'This file is fully typechecked with stricter rules; `T.untyped` is not allowed.',
};
