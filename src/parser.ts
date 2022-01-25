import { v4 as uuidv4 } from 'uuid';
import { getFluentBitSchema } from './getSchema';
import { COMMANDS, type FluentBitSchemaType, FLUENTBIT_REGEX } from './constants';
import {
  isCommandType,
  isCustomBlock,
  isFluentBit,
  isValidCommand,
  isValidFluentBitSchemaType,
  isValidToken,
} from './guards';
import { keywords, states } from 'moo';
import { schemaToString } from './schemaToString';
function normalizeField(field: string) {
  const normalizedField = field.toLowerCase();
  return normalizedField === 'match_regex' ? 'match' : normalizedField;
}
export function parse(config: string) {
  if (!config.replace(/\s/g, '')) {
    throw new Error('Invalid Config file');
  }
  const fields = config.match(FLUENTBIT_REGEX);
  let prev: number;

  if (!fields) {
    throw new Error('We could not find fields in the configuration');
  }
  const indexes = fields.map((field, key) => {
    if (key) {
      prev = config.indexOf(field, prev + fields[key - 1].length);
      return prev;
    }

    prev = config.indexOf(field);
    return prev;
  });
  const parsedByBlock = indexes.map((index, key) => config.slice(index, indexes[key + 1]));

  const parsedBlocksByLines = parsedByBlock.map((val) =>
    val.split('\n').filter((elm) => !!elm.replace(/\s/g, '').length)
  );

  const configBlocks = parsedBlocksByLines.map((val) => {
    const blockSchema = {} as FluentBitSchemaType;

    const [commandField, ...blocks] = val;

    const command = commandField.replace(/[\[\]]/g, '');

    if (!isValidCommand(command)) {
      throw new Error(`Command is not valid, we got ${command}, it should be ${Object.keys(COMMANDS)}`);
    }

    for (const block of blocks) {
      let temp = block.replace(/\s+/g, ' ');

      if (temp[0] === ' ') {
        temp = temp.substring(1);
      }

      if (temp[0] === '#') {
        continue;
      }

      const [field, ...properties] = temp.split(' ').filter(Boolean);

      blockSchema[normalizeField(field)] = properties.reduce((acc, cur) => acc + cur + ' ', ' ').slice(1, -1);
    }

    if (blockSchema.name && (blockSchema.name.includes('fluentbit_metrics') || blockSchema.name.includes('calyptia'))) {
      return null;
    }
    return { ...blockSchema, command, id: uuidv4() };
  });

  return configBlocks.filter(isValidFluentBitSchemaType);
}

const stateSet = {
  main: {
    lbrace: { match: '[', push: 'block' },
    properties: {
      // match: /\w+[\w+\/\.\d\*\-]+\s+[\/\w\/\.\d\*-]+/,
      match: /\w+[-.*\d\w]+\s.*/,
      // match: /\w+[-.*\d\w]+\s+[-.*\d\w\/,<>$\^\+\{\}\(\)\?]+/,
      value: (value: string) => value.replace(/\s+/, ' '),
      lineBreaks: true,
    },
    space: { match: /\s+/, lineBreaks: true },
    comment: { match: /#.*/, lineBreaks: true },
  },
  block: {
    command: {
      match: /\w+/,
      type: keywords(COMMANDS),
    },
    comment: { match: /#.*/, lineBreaks: true },
    rbrace: { match: ']', push: 'main' },
  },
};
export function parser2(config: string) {
  const lexer = states(stateSet);

  const tokens = lexer.reset(config);

  const configBlocks = [] as FluentBitSchemaType[];
  let block = {} as FluentBitSchemaType;
  let command = undefined as COMMANDS | undefined;

  for (const token of tokens) {
    // Ignoring spaces and comments
    if (!isValidToken(token.type)) {
      continue;
    }

    // If we find a valid command we begin collecting properties.
    if (isCommandType(token.type)) {
      command = token.value as COMMANDS;
      block = { command, id: uuidv4() };
      continue;
    }

    if (command) {
      if (token.type === 'properties') {
        const [key, value] = token.value.split(' ');

        block = {
          ...block,
          [normalizeField(key)]: value,
        };
        continue;
      }

      if (token.type === 'lbrace') {
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
  private _source: string;
  private _ast: FluentBitSchemaType[];
  constructor(source: string) {
    this._ast = parser2(source);
    this._source = source;
  }
  static isFluentBitConfiguration(source: string) {
    return isFluentBit(source);
  }
  get source() {
    return this._source;
  }
  get schema() {
    return getFluentBitSchema(this._ast);
  }
  toString() {
    return schemaToString(this._ast);
  }
}
