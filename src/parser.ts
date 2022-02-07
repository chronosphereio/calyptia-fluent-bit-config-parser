import { v4 as uuidv4 } from 'uuid';
import { COMMANDS, FluentBitSection, type FluentBitSchemaType } from './constants';
import { isCommandType, isCustomSection, isFluentBit, isUsefulToken, isValidFluentBitSection } from './guards';
import { keywords, states, Token } from 'moo';
import { schemaToString } from './schemaToString';
import { readFileSync, realpathSync } from 'fs';
import { join } from 'path';
import { dirname, isAbsolute } from 'path/posix';
import { TokenError } from './TokenError';
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

type FluentBitToken = Token & { filePath: string };

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
export function tokenize(config: string, filePath: string): FluentBitToken[] {
  if (!config.replace(/\s/g, '')) {
    throw new TokenError('File is empty', filePath, 0, 0);
  }

  if (!isFluentBit(config)) {
    throw new TokenError('This file is not a valid Fluent Bit config file', filePath, 0, 0);
  }

  let tokens = [] as FluentBitToken[];
  const lexer = states(stateSet).reset(config);

  // We will expand every include first, looking for any missing paths and invalid tokens
  // https://github.com/calyptia/fluent-bit-config-parser/issues/15
  for (const token of lexer) {
    if (token.type === TOKEN_TYPES.include) {
      const [, includeFilePath] = token.value.split(' ');

      let includeConfig = '';
      const fullPath = join(dirname(filePath), includeFilePath);

      try {
        const realPath = realpathSync(fullPath);

        includeConfig = readFileSync(realPath, { encoding: 'utf-8' });
      } catch (e) {
        throw new TokenError(`Can not read file, loading from ${filePath}`, fullPath, 0, 0);
      }

      const includeTokens = tokenize(includeConfig, fullPath);
      tokens = [...tokens, ...includeTokens];
    } else {
      tokens.push({ ...token, filePath });
    }
  }

  return tokens;
}
export function tokensToAST(tokens: FluentBitToken[]): FluentBitSchemaType[] {
  const configBlocks = [] as FluentBitSchemaType[];
  let block = {} as FluentBitSchemaType;
  let command = undefined as COMMANDS | undefined;

  for (const token of tokens) {
    // Ignoring spaces and comments
    if (!isUsefulToken(token.type)) {
      continue;
    }

    // If we find a valid command we begin collecting properties.
    if (isCommandType(token.type)) {
      command = token.value as COMMANDS;
      block = { command, id: uuidv4(), optional: {}, __filePath: token.filePath };
      continue;
    }

    if (command) {
      if (token.type === TOKEN_TYPES.properties) {
        const [key, ...value] = token.value.split(' ');
        const attrName = normalizeField(key);
        const attrValue = value.join(' ');

        if (attrName === 'name') {
          block = { ...block, [attrName]: attrValue };
        } else {
          block = {
            ...block,
            optional: { ...block.optional, [attrName]: attrValue },
          };
        }

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

  return [...configBlocks, block];
}

function getFullPath(filePath: string) {
  return isAbsolute(filePath) ? filePath : realpathSync(filePath);
}

export class FluentBitSchema {
  private _filePath: string;
  private _source: string;
  private _tokens: FluentBitToken[];
  constructor(source: string, filePath: string) {
    this._source = source;
    this._filePath = filePath;

    this._tokens = tokenize(source, getFullPath(filePath));
  }
  static isFluentBitConfiguration(source: string) {
    return isFluentBit(source);
  }
  get AST(): FluentBitSchemaType[] {
    return tokensToAST(this._tokens);
  }
  get filePath() {
    return this._filePath;
  }
  get source() {
    return this._source;
  }
  get schema() {
    const test = (node: FluentBitSchemaType) => {
      const isValidBlock = isValidFluentBitSection(node);
      const isNotCustomBlock = !isCustomSection(node);

      return isValidBlock && isNotCustomBlock;
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return this.AST.filter(test).map(({ __filePath, ...rest }) => ({ ...rest } as FluentBitSection));
  }
  toString(indent?: number) {
    return schemaToString(this.schema, { propIndent: indent });
  }
}
