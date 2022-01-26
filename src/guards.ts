import { FLUENTBIT_REGEX, COMMANDS, type FluentBitSchemaType, EXCLUDED_TAGS } from './constants';

export const isFluentBit = (config: string) => !!config.match(FLUENTBIT_REGEX);

export const isValidFluentBitSchemaType = (schema?: FluentBitSchemaType | null): schema is FluentBitSchemaType =>
  !!schema && !EXCLUDED_TAGS.has(schema.command.toLowerCase());

export const isString = (value?: string): value is string => typeof value === 'string';

export const isUsefulValidToken = (type?: string): boolean => isString(type) && !['space', 'comment'].includes(type);

export const isCommandType = (type?: string): type is COMMANDS =>
  isString(type) && Object.keys(COMMANDS).includes(type);

export const isCustomBlock = (block: FluentBitSchemaType) =>
  !!block.name && (block.name.includes('fluentbit_metrics') || block.name.includes('calyptia'));
