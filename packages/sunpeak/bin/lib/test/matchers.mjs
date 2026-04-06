/**
 * MCP-native custom matchers for Playwright's expect.
 *
 * These matchers operate on ToolResult objects returned by mcp.callTool()
 * and provide MCP-concept-native assertions.
 */

/**
 * Register MCP matchers on a Playwright expect instance.
 * @param {import('@playwright/test').Expect} expect
 */
export function registerMatchers(expect) {
  expect.extend({
    /**
     * Assert that a tool result is an error.
     * Usage: expect(result).toBeError()
     */
    toBeError(received) {
      const pass = received?.isError === true;
      return {
        pass,
        message: () =>
          pass
            ? `Expected tool result not to be an error, but it was`
            : `Expected tool result to be an error, but isError was ${received?.isError}`,
      };
    },

    /**
     * Assert that any content item's text contains the given string.
     * Usage: expect(result).toHaveTextContent('temperature')
     */
    toHaveTextContent(received, expected) {
      const content = received?.content || [];
      const texts = content
        .filter((c) => c.type === 'text' && typeof c.text === 'string')
        .map((c) => c.text);
      const pass = texts.some((t) => t.includes(expected));
      return {
        pass,
        message: () =>
          pass
            ? `Expected tool result not to contain text "${expected}", but found it`
            : `Expected tool result to contain text "${expected}" in content items.\nFound texts: ${JSON.stringify(texts)}`,
      };
    },

    /**
     * Assert that structuredContent matches the expected shape (deep partial match).
     * Usage: expect(result).toHaveStructuredContent({ type: 'weather' })
     */
    toHaveStructuredContent(received, expected) {
      const sc = received?.structuredContent;
      const pass = sc !== undefined && deepPartialMatch(sc, expected);
      return {
        pass,
        message: () =>
          pass
            ? `Expected structuredContent not to match, but it did`
            : `Expected structuredContent to match ${JSON.stringify(expected)}, got ${JSON.stringify(sc)}`,
      };
    },

    /**
     * Assert that content array contains an item of the given type.
     * Usage: expect(result).toHaveContentType('image')
     */
    toHaveContentType(received, expectedType) {
      const content = received?.content || [];
      const types = content.map((c) => c.type);
      const pass = types.includes(expectedType);
      return {
        pass,
        message: () =>
          pass
            ? `Expected content not to include type "${expectedType}", but it did`
            : `Expected content to include type "${expectedType}". Found types: ${JSON.stringify(types)}`,
      };
    },
  });
}

/**
 * Deep partial match: every key in `expected` must exist in `actual` and match.
 * Extra keys in `actual` are allowed.
 */
function deepPartialMatch(actual, expected) {
  if (expected === actual) return true;
  if (expected === null || actual === null) return expected === actual;
  if (typeof expected !== 'object' || typeof actual !== 'object') return expected === actual;
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return false;
    if (expected.length !== actual.length) return false;
    return expected.every((item, i) => deepPartialMatch(actual[i], item));
  }
  return Object.keys(expected).every(
    (key) => key in actual && deepPartialMatch(actual[key], expected[key])
  );
}
