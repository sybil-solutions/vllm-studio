// CRITICAL
"use client";

export const stripQueryAndHash = (value: string): string => {
  return value.split("?")[0]?.split("#")[0] ?? value;
};

// Resolve a relative path from a base path.
export const resolvePath = (basePath: string, relativePath: string): string => {
  const cleaned = stripQueryAndHash(relativePath).trim();
  if (cleaned.startsWith("/")) return cleaned.replace(/^\/+/, "");
  const baseDir = basePath.includes("/") ? basePath.substring(0, basePath.lastIndexOf("/")) : "";
  let resolved = cleaned.replace(/^\.\//, "");
  const parts = baseDir.split("/").filter(Boolean);
  while (resolved.startsWith("../")) {
    parts.pop();
    resolved = resolved.substring(3);
  }
  return parts.length > 0 ? `${parts.join("/")}/${resolved}` : resolved;
};

export const isLocalImportSpecifier = (spec: string): boolean => {
  if (!spec) return false;
  if (spec.startsWith("http://") || spec.startsWith("https://") || spec.startsWith("//")) return false;
  if (spec.startsWith("data:") || spec.startsWith("blob:")) return false;
  if (spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("/")) return true;
  return /\.[a-z0-9]+$/i.test(spec);
};

