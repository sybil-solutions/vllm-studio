// CRITICAL
"use client";

export function getFileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function getLanguageFromExt(ext: string): string {
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    py: "python",
    rs: "rust",
    go: "go",
    rb: "ruby",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "c",
    css: "css",
    scss: "scss",
    html: "html",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    xml: "xml",
    md: "markdown",
    txt: "plaintext",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    sql: "sql",
  };
  return langMap[ext] || "plaintext";
}

export function isImageFile(name: string): boolean {
  const ext = getFileExtension(name);
  return ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"].includes(ext);
}

export function isBase64(value: string): boolean {
  if (!value || value.length < 16) return false;
  if (value.length > 5_000_000) return false;
  if (value.includes("\n") || value.includes("\r")) return false;
  // Avoid false positives for plain text by requiring plausible padding and length.
  if (value.length % 4 !== 0) return false;
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  return base64Regex.test(value);
}

export function isPreviewableExt(ext: string): boolean {
  return ["html", "svg", "js", "jsx", "ts", "tsx", "mjs", "cjs", "md", "markdown"].includes(ext);
}

