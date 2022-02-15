import { v4 as uuidv4 } from 'uuid';
import {
  COMMANDS,
  FluentBitSection,
  FluentBitToken,
  TOKEN_TYPES,
  TOKEN_TYPES_DIRECTIVES,
  type FluentBitSchemaType,
} from './constants';
import { isCommandType, isCustomSectionName, isFluentBit, isValidFluentBitSection } from './guards';
import { keywords, states } from 'moo';
import { schemaToString } from './schemaToString';
import { readFileSync, realpathSync } from 'fs';
import { join } from 'path';
import { dirname, isAbsolute } from 'path/posix';
import { TokenError } from './TokenError';
import { TokenIndex } from './TokenIndex';

function normalizeField(field: string) {
  const normalizedField = field.toLowerCase();
  return normalizedField === 'match_regex' ? 'match' : normalizedField;
}

/**
 * You might be wondering why the `DIRECTIVE` regex used on the states is wider than the one used here, (`DIRECTIVE_EXTRACTION_REGEX`).
 *  The one used for the states has to be relaxed to be able to return the right guidance on the error. Chiefly, we want to provide
 * a richer error response other than the one provided by moo library.
 * We will collect all directives like tokens as valid, and later on (in tokenize function) sass out which ones are valid or not.
 * follow [this link for an example with test data](https://regex101.com/r/gks9tK/1)
 **/
const DIRECTIVE_EXTRACTION_REGEX = /@(\w+)\s+[a-zA-Z.\/].*/;

/**
 * This Function will allow us to filter out the directives that are malformed without producing an error at the tokenizer level.
 */
const caseInsensitiveKeywords = (defs: Record<string, string>) => {
  const keys = keywords(defs);
  return (value: string) => {
    const matches = value.match(DIRECTIVE_EXTRACTION_REGEX) || [];
    try {
      return keys(matches[1].toUpperCase());
    } catch (e) {
      return keys('');
    }
  };
};

const stateSet = {
  main: {
    [TOKEN_TYPES.OPEN_BLOCK]: { match: '[', push: 'block' },
    [TOKEN_TYPES.DIRECTIVES]: [
      {
        match: /@\w+\s+.*/,
        type: caseInsensitiveKeywords(TOKEN_TYPES_DIRECTIVES),
        value: (text: string) => {
          const [, directive, ...rest] = text.trim().split(/(@\w+)/i);
          return `${directive.toUpperCase()} ${rest.join('').trim()}`;
        },
      },
    ],
    [TOKEN_TYPES.PROPERTIES]: [
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
    [TOKEN_TYPES.COMMAND]: {
      match: /\w+/,
      type: keywords(COMMANDS),
    },
    [TOKEN_TYPES.COMMENT]: { match: /#.*/, lineBreaks: true },
    [TOKEN_TYPES.CLOSE_BLOCK]: { match: ']', push: 'main' },
  },
};
type TokenizeProps = {
  config: string;
  filePath: string;
  directives: FluentBitToken[];
  pathMemo?: Set<string>;
  options?: TokenizeOptions;
};

type TokenizeOptions = {
  ignoreFullPaths: boolean;
};
export function tokenize({
  config,
  filePath,
  directives,
  pathMemo = new Set(),
  options = { ignoreFullPaths: false },
}: TokenizeProps): FluentBitToken[] {
  if (!config.replace(/\s/g, '')) {
    throw new TokenError('File is empty', filePath, 0, 0);
  }

  if (!isFluentBit(config)) {
    throw new TokenError('This file is not a valid Fluent Bit config file', filePath, 0, 0);
  }

  let tokens = [] as FluentBitToken[];
  const lexer = states(stateSet).reset(config);

  // We will expand every @INCLUDE first, looking for any missing paths and invalid tokens
  // https://github.com/calyptia/fluent-bit-config-parser/issues/15
  // We will also validate @SET directive
  for (const token of lexer) {
    if (token.type === TOKEN_TYPES.DIRECTIVES) {
      throw new TokenError(
        `You have defined a directive that cannot be parse (${token.text}). The supported directives are: ${Object.keys(
          TOKEN_TYPES_DIRECTIVES
        )}`,
        filePath,
        token.line,
        token.col
      );
    }
    if (token.type === TOKEN_TYPES_DIRECTIVES.SET) {
      directives.push({ ...token, filePath });
    }

    if (token.type === TOKEN_TYPES_DIRECTIVES.INCLUDE) {
      const [, includeFilePath, ...rest] = token.text.split(' ');

      // In case we find more arguments in the value given to the include directive we will fail with some guidance in the error.
      if (rest.length) {
        throw new TokenError(
          `You are trying to include ${includeFilePath}, but we also found more arguments (${rest}). @INCLUDE directive can only have a single value (ex: @INCLUDE path/to/a/file)`,
          filePath,
          token.line,
          token.col
        );
      }

      // We will ignore full paths on @INCLUDE directive
      if (isAbsolute(includeFilePath) && options.ignoreFullPaths) {
        continue;
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
        throw new TokenError(`Can not find file ${includeFilePath}`, filePath, token.line, token.col);
      }

      directives.push({ ...token, filePath: fullPath });
      const includeTokens = tokenize({ config: includeConfig, filePath: fullPath, directives, pathMemo });
      tokens = [...tokens, ...includeTokens];
    } else {
      tokens.push({ ...token, filePath });
    }
  }

  return tokens;
}
export function tokensToAST(tokens: FluentBitToken[], tokenIndex: TokenIndex): FluentBitSchemaType[] {
  const configBlocks = [] as FluentBitSchemaType[];
  let block = {} as FluentBitSchemaType;
  let command = undefined as COMMANDS | undefined;

  for (const token of tokens) {
    if (token.type === TOKEN_TYPES.SPACE) {
      continue;
    }

    if (token.type === TOKEN_TYPES.OPEN_BLOCK) {
      if (command) {
        configBlocks.push(block);
      }
      block = { id: uuidv4() } as FluentBitSchemaType;
      tokenIndex.set(block.id, token);
      command = undefined;
      continue;
    }

    // If we find a valid command we begin collecting properties.
    if (isCommandType(token.type)) {
      command = token.value as COMMANDS;
      block = { ...block, command, optional: {}, __filePath: token.filePath };

      tokenIndex.set(block.id, token);
      continue;
    }

    if (command) {
      if (token.type === TOKEN_TYPES.PROPERTIES) {
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
      }
      tokenIndex.set(block.id, token);
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
  private _tokenIndex: TokenIndex;

  private _directives: FluentBitToken[];
  constructor(source: string, filePath: string, tokenizeOptions: TokenizeOptions = { ignoreFullPaths: false }) {
    this._source = source;
    this._filePath = filePath;
    this._directives = [] as FluentBitToken[];
    this._tokens = tokenize({
      config: source,
      filePath: getFullPath(filePath),
      directives: this._directives,
      options: tokenizeOptions,
    });
    this._tokenIndex = new TokenIndex();
  }
  static isFluentBitConfiguration(source: string): boolean {
    return isFluentBit(source);
  }
  get AST(): FluentBitSchemaType[] {
    this._tokenIndex.clear();
    return tokensToAST(this._tokens, this._tokenIndex);
  }
  get filePath(): string {
    return this._filePath;
  }
  get source(): string {
    return this._source;
  }

  get directives(): FluentBitToken[] {
    return this._directives;
  }
  get schema(): FluentBitSection[] {
    const test = (node: FluentBitSchemaType) => {
      const isValidBlock = isValidFluentBitSection(node);
      const isNotCustomSectionName = !isCustomSectionName(node);

      return isValidBlock && isNotCustomSectionName;
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return this.AST.filter(test).map(({ __filePath, ...rest }) => ({ ...rest } as FluentBitSection));
  }

  getTokensBySectionId(sectionId: string): FluentBitToken[] | undefined {
    return this._tokenIndex.get(sectionId);
  }
  toString(indent?: number): string {
    return schemaToString(this.schema, this.directives, { propIndent: indent });
  }
}
