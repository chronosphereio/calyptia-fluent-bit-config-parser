export enum COMMANDS {
  OUTPUT = 'OUTPUT',
  INPUT = 'INPUT',
  FILTER = 'FILTER',
  SERVICE = 'SERVICE',
  PARSER = 'PARSER',
  CUSTOM = 'CUSTOM',
}
export type FluentBitSchemaType = {
  id: string;
  name?: string;
  command: COMMANDS;
  optional?: Record<string, unknown>;
} & { [key: string]: unknown };
export const FLUENTBIT_REGEX = /(?<![#][ ]*)\[[A-Z]{1,}\]/g;

export const EXCLUDED_TAGS = new Set(['service', 'parser', 'node', 'upstream']);
