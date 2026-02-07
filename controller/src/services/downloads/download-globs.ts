// CRITICAL

const escapeRegex = (value: string): string => value.replace(/[.+^${}()|[\]\\]/g, "\\$&");

const compileGlob = (pattern: string): RegExp => {
  const escaped = escapeRegex(pattern);
  const regex = "^" + escaped.replace(/\*/g, ".*") + "$";
  return new RegExp(regex, "i");
};

/**
 * Returns true if value matches any glob pattern (supports `*`).
 * @param value - String to test.
 * @param patterns - Glob patterns.
 * @returns Whether any pattern matches.
 */
export const matchesAny = (value: string, patterns: string[]): boolean => {
  if (patterns.length === 0) {
    return false;
  }
  return patterns.some((pattern) => compileGlob(pattern).test(value));
};

