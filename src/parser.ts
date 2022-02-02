import { v4 as uuidv4 } from 'uuid';
import { getFluentBitSchema } from './getSchema';
import { COMMANDS, type FluentBitSchemaType } from './constants';
import { isCommandType, isCustomBlock, isFluentBit, isUsefulValidToken, isValidFluentBitSchemaType } from './guards';
import { keywords, states, Token } from 'moo';
import { schemaToString } from './schemaToString';
import { readFileSync, realpathSync } from 'fs';
import { join } from 'path';
import { basename } from 'path/posix';
function normalizeField(field: string) {
  const normalizedField = field.toLowerCase();
  return normalizedField === 'match_regex' ? 'match' : normalizedField;
}
enum TOKEN_TYPES {
  properties = 'PROPERTIES',
  closeBlock = 'CLOSE_BLOCK',
  openBlock = 'OPEN_BLOCK',
  command = 'COMMAND',
  include = 'INCLUDE',
}

type FLUENT_BIT_TOKEN = Token & { directive?: string; filePath: string };

const stateSet = {
  main: {
    [TOKEN_TYPES.openBlock]: { match: '[', push: 'block' },
    [TOKEN_TYPES.include]: { match: /@include+\s.*/, lineBreak: true },
    [TOKEN_TYPES.properties]: [
      {
        match: /\w+[-.*\d\w]+\s.*/,
        value: (value: string) => value.replace(/\s+/, ' ').trim(),
        lineBreaks: true,
      },
    ],
    space: { match: /\s+/, lineBreaks: true },
    comment: { match: /#.*/, lineBreaks: true },
  },
  block: {
    [TOKEN_TYPES.command]: {
      match: /\w+/,
      type: keywords(COMMANDS),
    },
    comment: { match: /#.*/, lineBreaks: true },
    [TOKEN_TYPES.closeBlock]: { match: ']', push: 'main' },
  },
};
export function tokenize(config: string, filePath: string): FLUENT_BIT_TOKEN[] {
  if (!config.replace(/\s/g, '')) {
    throw new Error('Invalid config file');
  }

  if (!isFluentBit(config)) {
    throw new Error('This file is not a valid Fluent Bit config file');
  }

  let tokens = [] as FLUENT_BIT_TOKEN[];
  const lexer = states(stateSet).reset(config);

  // We will expand every include first, looking for any missing paths and invalid tokens
  for (const token of lexer) {
    if (token.type === TOKEN_TYPES.include) {
      const [, includeFilePath] = token.value.split(' ');

      const fullPath = realpathSync(join(basename(filePath), includeFilePath));

      try {
        const includeConfig = readFileSync(fullPath, { encoding: 'utf-8' });

        tokens = [...tokens, ...tokenize(includeConfig, filePath)];
      } catch (e) {
        throw new Error(`${token.line}:${token.col} Path ${filePath}. Valid commands are ${Object.keys(COMMANDS)}`);
      }
    } else {
      tokens.push({ ...token, filePath });
    }
  }

  return tokens;
}
export function parser(config: string, filePath: string) {
  const tokens = tokenize(config, filePath);

  const configBlocks = [] as FluentBitSchemaType[];
  let block = {} as FluentBitSchemaType;
  let command = undefined as COMMANDS | undefined;

  for (const token of tokens) {
    // Ignoring spaces and comments
    if (!isUsefulValidToken(token.type)) {
      continue;
    }

    if (token.type === TOKEN_TYPES.command) {
      throw new Error(
        `${token.line}:${token.col} Invalid command ${token.value}. Valid commands are ${Object.keys(COMMANDS)}`
      );
    }
    // If we find a valid command we begin collecting properties.
    if (isCommandType(token.type)) {
      command = token.value as COMMANDS;
      block = { command, id: uuidv4() };
      continue;
    }

    if (command) {
      if (token.type === TOKEN_TYPES.properties) {
        const [key, ...value] = token.value.split(' ');

        block = {
          ...block,
          [normalizeField(key)]: value.join(' '),
        };
        continue;
      }

      if (token.type === TOKEN_TYPES.openBlock) {
        configBlocks.push({ ...block });
        block = {} as FluentBitSchemaType;
        command = undefined;
        continue;
      }
    }
  }

  configBlocks.push({ ...block });

  return configBlocks.filter((block) => isValidFluentBitSchemaType(block) && !isCustomBlock(block));
}

export class FluentBitSchema {
  private _filePath: string;
  private _source: string;
  private _ast: FluentBitSchemaType[];
  constructor(source: string, filePath: string) {
    this._source = source;
    this._filePath = filePath;
    this._ast = parser(source, filePath);
  }
  static isFluentBitConfiguration(source: string) {
    return isFluentBit(source);
  }
  get AST() {
    return this._ast;
  }

  get filePath() {
    return this._filePath;
  }
  get source() {
    return this._source;
  }
  get schema() {
    return getFluentBitSchema(this._ast);
  }
  toString(indent?: number) {
    return schemaToString(this._ast, { propIndent: indent });
  }
}
