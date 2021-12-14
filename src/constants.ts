export enum COMMANDS {
  OUTPUT = 'OUTPUT',
  INPUT = 'INPUT',
  FILTER = 'FILTER',
  SERVICE = 'SERVICE',
  PARSER = 'PARSER',
}
export type FluentBitSchemaType = {
  id: string;
  name?: string;
  command: COMMANDS;
  optional?: unknown;
} & { [key: string]: unknown };
export const FLUENTBIT_REGEX = /(?<![#][ ]*)\[[A-Z]{1,}\]/g;
export const FLUENTD_REGEX = /(?<![#][ ]*)\<[a-zA-Z-@/. \_*\{\},]{1,}\>/g;

export const ATTR_TYPES = ['source', 'filter', 'match', 'label'];

export const EXCLUDED_TAGS = new Set(['service', 'parser', 'node', 'upstream']);
