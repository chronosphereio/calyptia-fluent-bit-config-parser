import { FLUENTBIT_REGEX, COMMANDS, type FluentBitSchemaType, EXCLUDED_TAGS } from './constants';

export const isValidCommand = (value: string): value is COMMANDS => Object.keys(COMMANDS).includes(value);

export const isFluentBit = (config: string) => !!config.match(FLUENTBIT_REGEX);

export const isValidFluentBitSchemaType = (schema?: FluentBitSchemaType | null): schema is FluentBitSchemaType =>
  !!schema && !EXCLUDED_TAGS.has(schema.command.toLowerCase());
