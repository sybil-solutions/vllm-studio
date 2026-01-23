/**
 * Box Tags Parser
 * Strips <|begin_of_box|> and <|end_of_box|> tags from text
 */

import type { IBoxTagsParser } from "../types";

const BOX_TAGS_PATTERN = /<\|(?:begin|end)_of_box\|>/g;

export class BoxTagsParser implements IBoxTagsParser {
  readonly name = "box-tags" as const;

  parse(input: string): string {
    if (!input) return input;
    return input.replace(BOX_TAGS_PATTERN, "");
  }

  canParse(input: string): boolean {
    return BOX_TAGS_PATTERN.test(input);
  }
}

export const boxTagsParser = new BoxTagsParser();
