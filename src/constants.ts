import type { Token } from 'moo';
import { getBorderCharacters } from 'table';

export enum COMMANDS {
  OUTPUT = 'OUTPUT',
  INPUT = 'INPUT',
  FILTER = 'FILTER',
  SERVICE = 'SERVICE',
  CUSTOM = 'CUSTOM',

  PARSER = 'PARSER',
  MULTILINE_PARSER = 'MULTILINE_PARSER',

  PLUGINS = 'PLUGINS',

  UPSTREAM = 'UPSTREAM',
  NODE = 'NODE',
}
export enum TOKEN_TYPES_DIRECTIVES {
  SET = 'SET',
  INCLUDE = 'INCLUDE',
}
export enum TOKEN_TYPES {
  PROPERTIES = 'PROPERTIES',
  CLOSE_BLOCK = 'CLOSE_BLOCK',
  OPEN_BLOCK = 'OPEN_BLOCK',
  COMMAND = 'COMMAND',
  SPACE = 'SPACE',
  COMMENT = 'COMMENT',

  DIRECTIVES = 'DIRECTIVES',
}
export type FluentBitSection = {
  id: string;
  name?: string;
  command: keyof typeof COMMANDS;
  optional?: Record<string, string>;
};

export interface FluentBitSchemaType extends FluentBitSection {
  __filePath: string;
}

export type FluentBitToken = Token & { filePath: string };
export const FLUENTBIT_REGEX = /(?<![#][ ]*)\[[A-Z_]{1,}\]/g;

/** It will match @includes files as a valid Fluent Bit configuration.
 *  [Follow this link for an example](https://regex101.com/r/zrSRR2/1)
 */
export const FLUENTBIT_INCLUDE_REGEX = /(@include+\s.*){1,}/g;

export const EXCLUDED_TAGS = new Set([
  COMMANDS.SERVICE.toLowerCase(),
  COMMANDS.PARSER.toLowerCase(),
  COMMANDS.PLUGINS.toLowerCase(),
  COMMANDS.MULTILINE_PARSER.toLowerCase(),
  COMMANDS.MULTILINE_PARSER.toLowerCase(),
  COMMANDS.MULTILINE_PARSER.toLowerCase(),
  COMMANDS.NODE.toLowerCase(),
  COMMANDS.UPSTREAM.toUpperCase(),
]);

export const NO_STYLES_IN_TABLE = {
  border: getBorderCharacters('void'),
  columnDefault: {
    paddingLeft: 0,
    paddingRight: 1,
  },
  drawHorizontalLine: (): boolean => false,
};

export enum CUSTOM_SECTIONS_NAMES {
  FLUENTBIT_METRICS = 'fluentbit_metrics',
  CALYPTIA = 'calyptia',
}
