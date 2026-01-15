const BOX_TAGS_PATTERN = /<\|(?:begin|end)_of_box\|>/g;
const stripBoxTags = (text: string) => (text ? text.replace(BOX_TAGS_PATTERN, '') : text);

export function stripThinkTagsKeepText(text: string): string {
  return text?.replace(/<\/?think(?:ing)?>/gi, '') || '';
}

export function normalizeAssistantMarkdownForRender(content: string): string {
  if (!content) return '';
  let text = stripBoxTags(content);

  // Fix common "no newline after fence language" issue (e.g., ```html<!DOCTYPE html>)
  text = text.replace(/```(html|svg|jsx|tsx|react|javascript|js)(?=\S)/gi, '```$1\n');

  // Some models output `mermaidgraph` instead of `mermaid`.
  text = text.replace(/```mermaidgraph\b/gi, '```mermaid');
  // And sometimes they omit the `graph` keyword: ```mermaidgraph LR A-->B
  text = text.replace(/```mermaid\s*(?:graph\s+)?(?=[A-Z]{1,3}\b)/gi, '```mermaid\ngraph ');

  // Ensure bullet points are always on new lines
  // This handles cases where bullets appear inline with text: "text - item" -> "text\n- item"
  // We process line by line to avoid breaking code blocks or tables
  const linesForBullets = text.split('\n');
  const processedLines: string[] = [];
  let inCodeBlock = false;
  
  // Helper to detect if a line is likely a table row
  const looksLikeTableRow = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed.includes('|')) return false;
    const pipeCount = (trimmed.match(/\|/g) || []).length;
    // Must have at least 2 pipes to be a table
    if (pipeCount < 2) return false;
    // Check if it's a divider (only dashes, colons, pipes, spaces)
    const dividerPattern = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/;
    if (dividerPattern.test(trimmed)) return true;
    // If it has pipes and looks structured, it's likely a table row
    // Avoid false positives: if it starts with a list marker, it's probably a list
    if (/^\s*[-*+]\s+/.test(trimmed) || /^\s*\d+\.\s+/.test(trimmed)) return false;
    return true;
  };
  
  for (const line of linesForBullets) {
    // Track code blocks
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      processedLines.push(line);
      continue;
    }
    
    // Skip processing inside code blocks
    if (inCodeBlock) {
      processedLines.push(line);
      continue;
    }
    
    // Skip if line already starts with a list marker
    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      processedLines.push(line);
      continue;
    }
    
    // Skip if line is part of a table (more robust detection)
    // Check for table rows: has pipes, 1+ pipes, 2+ segments, not a list marker
    const hasPipesInLine = line.includes('|');
    const pipeCountInLine = hasPipesInLine ? (line.match(/\|/g) || []).length : 0;
    const segmentCountInLine = hasPipesInLine ? line.split('|').filter(s => s.trim().length > 0).length : 0;
    const isListMarkerLine = /^\s*[-*+]\s+/.test(line.trim()) || /^\s*\d+\.\s+/.test(line.trim());
    const isTableRowLine = hasPipesInLine && pipeCountInLine >= 1 && segmentCountInLine >= 2 && !isListMarkerLine;
    
    if (isTableRowLine || looksLikeTableRow(line)) {
      processedLines.push(line);
      continue;
    }
    
    // Find inline list markers and hash headings, split them onto new lines
    // Match: non-whitespace, whitespace, then bullet marker followed by space
    // But NOT if we're inside a table structure (has pipes with 2+ segments)
    let processedLine = line;
    
    // Only process bullets and headings if this is definitely NOT a table row
    // The check above should have caught table rows, but add extra safety
    // Also check if line contains pipes - if so, skip all processing to avoid breaking tables
    const shouldProcess = !isTableRowLine && !looksLikeTableRow(line) && !line.includes('|');
    
    if (shouldProcess) {
      // First, handle inline hash headings (e.g., "text### heading" -> "text\n### heading")
      // Match: non-whitespace character (not # or |), then # (1-6 times) followed by space and non-# character
      // Use negative lookahead to ensure we match the full hash sequence
      processedLine = processedLine.replace(/([^\s#\|])(#{1,6})(\s+)(?=[^\s#])/g, (match, before, hashes, afterSpace, offset, string) => {
        // Verify there's actual content after (the lookahead ensures this)
        return `${before}\n${hashes}${afterSpace}`;
      });
      
      // Then, handle inline bullet markers
      processedLine = processedLine.replace(/([^\s|])(\s+)([-*+])(\s+)/g, (match, before, spaces, bullet, afterSpace) => {
        return `${before}\n${bullet}${afterSpace}`;
      });
    }
    
    processedLines.push(processedLine);
  }
  
  text = processedLines.join('\n');

  // Repair standalone `mermaidgraph` blocks that aren't fenced, and fix ` `` ` closers.
  const lines = text.split('\n');
  const out: string[] = [];
  let i = 0;

  const isFenceCloser = (line: string) => /^\s*```\s*$/.test(line) || /^\s*``\s*$/.test(line);
  const isFenceOpener = (line: string) => /^\s*```/.test(line);
  const isHeading = (line: string) => /^#{1,6}\s+/.test(line);
  const isListMarker = (line: string) => /^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line);
  const isTableDivider = (line: string) => {
    // More robust table divider detection
    const trimmed = line.trim();
    if (!trimmed.includes('|')) return false;
    // Check if it's a divider: contains only pipes, dashes, colons, and spaces
    const dividerPattern = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/;
    return dividerPattern.test(trimmed);
  };
  const isTableRow = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.includes('|')) return false;
    // Must have at least 2 pipes to be a table row
    const pipeCount = (trimmed.match(/\|/g) || []).length;
    if (pipeCount < 2) return false;
    // Not a divider
    if (isTableDivider(trimmed)) return false;
    // Not a list item that happens to contain a pipe
    if (isListMarker(trimmed)) return false;
    // If it has pipes and multiple segments, it's likely a table row
    // Check if it has structure that looks like table cells
    const segments = trimmed.split('|').filter(s => s.trim().length > 0);
    return segments.length >= 2;
  };

  let inFence = false;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!inFence && /^mermaidgraph\b/i.test(trimmed)) {
      const rest = trimmed.replace(/^mermaidgraph\b/i, '').trim();
      out.push('```mermaid');
      if (rest) out.push(`graph ${rest}`);
      else out.push('graph TD');
      i++;

      while (i < lines.length) {
        const l = lines[i];
        if (isFenceOpener(l) || isFenceCloser(l)) {
          i++;
          break;
        }
        out.push(l);
        i++;
      }

      out.push('```');
      continue;
    }

    if (/^\s*``\s*$/.test(raw)) {
      out.push('```');
      inFence = !inFence;
      i++;
      continue;
    }

    if (isFenceCloser(raw) && inFence) {
      inFence = false;
      out.push(raw);
      i++;
      continue;
    }

    if (isFenceOpener(raw)) {
      inFence = true;
      out.push(raw);
      i++;
      continue;
    }

    if (!inFence) {
      let normalized = raw;

      // Ensure list markers are at the start of the line
      // Handle inline list markers: "text - item" -> "text\n- item"
      if (!isListMarker(normalized) && /[^\n]([-*+])\s+/.test(normalized)) {
        normalized = normalized.replace(/([^\n])(\s+)([-*+])(\s+)/g, '$1\n$3$4');
      }

      // Normalize headings that start at the beginning of a line
      // Add space after hashes if missing (e.g., "###Heading" -> "### Heading")
      // Use a pattern that matches the full hash sequence
      if (/^\s*#+/.test(normalized)) {
        normalized = normalized.replace(/^(\s*)(#+)(\s*)(?=\S)/, (match, leadingSpace, hashes, existingSpace) => {
          // Only add space if there isn't already one
          if (existingSpace.length === 0 && hashes.length <= 6) {
            return `${leadingSpace}${hashes} `;
          }
          return match;
        });
      }

      // This regex was splitting headings incorrectly - removed since we handle it earlier
      // if (/(\S)(#{2,6})(?=[A-Za-z])/.test(normalized)) {
      //   normalized = normalized.replace(/(\S)(#{2,6})(?=[A-Za-z])/g, '$1\n\n$2 ');
      // }

      const normalizedTrimmed = normalized.trim();

      // Early check for table rows (before list/heading checks)
      // A line with pipes and 2+ segments is likely a table row
      // (1 pipe = 2 columns, 2+ pipes = 3+ columns)
      if (normalizedTrimmed) {
        const hasPipes = normalizedTrimmed.includes('|');
        const pipeCount = hasPipes ? (normalizedTrimmed.match(/\|/g) || []).length : 0;
        const segmentCount = hasPipes ? normalizedTrimmed.split('|').filter(s => s.trim().length > 0).length : 0;
        const looksLikeTable = hasPipes && pipeCount >= 1 && segmentCount >= 2 && !isListMarker(normalizedTrimmed);
        
        if (looksLikeTable || isTableRow(normalizedTrimmed) || isTableDivider(normalizedTrimmed)) {
          const prev = out[out.length - 1]?.trim() ?? '';
          if (prev && !(isTableRow(prev) || isTableDivider(prev) || (prev.includes('|') && (prev.match(/\|/g) || []).length >= 2))) {
            out.push('');
          }
          let tableLine = normalizedTrimmed;
          if (!tableLine.startsWith('|')) {
            tableLine = `| ${tableLine}`;
          }
          if (!tableLine.endsWith('|')) {
            tableLine = `${tableLine} |`;
          }
          if (isTableDivider(tableLine)) {
            const parts = tableLine.split('|').map((part) => part.trim()).filter((p) => p);
            const normalizedParts = parts.map((part) => {
              if (/^:?-{2,}:?$/.test(part)) {
                return ` ${part} `;
              }
              if (/^-{2,}$/.test(part)) {
                return ` ${part} `;
              }
              return ` ${part} `;
            });
            tableLine = `|${normalizedParts.join('|')}|`;
          }
          out.push(tableLine);
          i++;
          continue;
        }
      }

      // Handle list items - ensure they're on their own line
      if (normalizedTrimmed && isListMarker(normalizedTrimmed)) {
        const prev = out[out.length - 1]?.trim() ?? '';
        // Add blank line before list if previous line is not a list item
        if (prev && !isListMarker(prev) && !isTableRow(prev) && !isTableDivider(prev) && !isHeading(prev)) {
          out.push('');
        }
        out.push(normalizedTrimmed);
        i++;
        continue;
      }

      if (normalizedTrimmed && isHeading(normalizedTrimmed)) {
        const prev = out[out.length - 1]?.trim() ?? '';
        if (prev) out.push('');
        out.push(normalizedTrimmed);
        i++;
        continue;
      }


      out.push(normalized);
      i++;
      continue;
    }

    out.push(raw);
    i++;
  }

  return out.join('\n');
}
