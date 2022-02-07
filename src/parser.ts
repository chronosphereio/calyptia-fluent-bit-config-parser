import { v4 as uuidv4 } from 'uuid';
import { COMMANDS, FluentBitSection, TOKEN_TYPES, type FluentBitSchemaType } from './constants';
import { isCommandType, isCustomSectionName, isFluentBit, isUsefulToken, isValidFluentBitSection } from './guards';
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
    [TOKEN_TYPES.SPACE]: { match: /\s+/, lineBreaks: true },
    [TOKEN_TYPES.COMMENT]: { match: /#.*/, lineBreaks: true },
  },
  block: {
    [TOKEN_TYPES.command]: {
      match: /\w+/,
      type: keywords(COMMANDS),
    },
    [TOKEN_TYPES.COMMENT]: { match: /#.*/, lineBreaks: true },
    [TOKEN_TYPES.closeBlock]: { match: ']', push: 'main' },
  },
};
export function tokenize(config: string, filePath: string, pathMemo = new Set()): FluentBitToken[] {
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
      const [, includeFilePath, ...rest] = token.value.split(' ');

      // In case we find more arguments in the value given to the include directive we will fail with some guidance in the error.
      if (rest.length) {
        throw new TokenError(
          `You are trying to include ${includeFilePath}, but we also found more arguments (${rest}). Includes can only have a single value (ex: @includes path/to/a/file)`,
          filePath,
          token.line,
          token.col
        );
      }
      let includeConfig = '';
      const fullPath = join(dirname(filePath), includeFilePath);

      try {
        const realPath = realpathSync(fullPath);

        if (pathMemo.has(realPath)) {
          throw new TokenError(
            `You are trying to include ${realPath}. Fluent Bit does not allow a file to be included twice in the same configuration`,
            filePath,
            token.line,
            token.col
          );
        }

        includeConfig = readFileSync(realPath, { encoding: 'utf-8' });
        pathMemo.add(realPath);
      } catch (e) {
        if (e instanceof TokenError) {
          throw e;
        }
        throw new TokenError(`Can not read file, loading from ${filePath} `, fullPath, token.line, token.col);
      }

      const includeTokens = tokenize(includeConfig, fullPath, pathMemo);
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
      const isNotCustomSectionName = !isCustomSectionName(node);

      return isValidBlock && isNotCustomSectionName;
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return this.AST.filter(test).map(({ __filePath, ...rest }) => ({ ...rest } as FluentBitSection));
  }
  toString(indent?: number) {
    return schemaToString(this.schema, { propIndent: indent });
  }
}
