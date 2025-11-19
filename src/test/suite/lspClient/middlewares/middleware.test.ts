import * as assert from 'assert';
import { basename } from 'path';
import { compact } from '../../../../lspClient/middlewares/middleware';

suite(`Suite: ${basename(__filename, '.test.js')}`, () => {
  test('`compact` helper', () => {
    const cases = [
      // Basic transitions
      ['Hello\nWorld', 'Hello. World'],
      ['Hello\nworld', 'Hello world'],
      ['Hello.\nWorld', 'Hello. World'],
      ['Hello!\nWorld', 'Hello! World'],
      ['Hello?\nWorld', 'Hello? World'],
      ['Hello:\nWorld', 'Hello: World'],
      ['Hello;\nWorld', 'Hello; World'],
      ['Hello,\nWorld', 'Hello, World'],

      // Multiple newlines
      ['Hello\n\nWorld', 'Hello. World'],
      ['Hello.\n\nWorld', 'Hello. World'],

      // Leading whitespace
      ['Hello\n   World', 'Hello. World'],
      ['Hello\n   world', 'Hello world'],

      // With "Note:"
      ['Hello\nNote: World', 'Hello. World'],
      ['Hello\nNote: world', 'Hello. World'],
      ['Hello.\nNote: World', 'Hello. World'],
      ['Hello!\nNote: world', 'Hello! World'],

      // Already punctuated, lowercase
      ['This is a test.\nand another line', 'This is a test. and another line'],
      ['This is a test!\nand another line', 'This is a test! and another line'],
      ['This is a test:\nand another line', 'This is a test: and another line'],

      // Unicode: Not Supported for now.
      // ['Hello\nÉclair', 'Hello. Éclair'],
      // ['Hello\néclair', 'Hello éclair'],

      // Edge: newline at end
      ['Hello\n', 'Hello'],

      // Edge: newline followed by digit
      ['Hello\n123', 'Hello 123'],

      // Edge: newline followed by punctuation
      ['Hello\n.', 'Hello .'],

      // Edge: "Note:" with punctuation
      ['Hello!\nNote: Another', 'Hello! Another'],
      ['Hello.\nNote: Another', 'Hello. Another'],

      // Mixed casing
      ['Hello\nNote: another', 'Hello. Another'],
      ['Hello\nNote: Another', 'Hello. Another'],

      // No punctuation, lowercase
      ['This is a test\nand another line', 'This is a test and another line'],

      // No punctuation, uppercase
      ['This is a test\nAnother line', 'This is a test. Another line'],
    ];

    for (const [input, expected] of cases) {
      assert.strictEqual(compact(input), expected);
    }
  });
});
