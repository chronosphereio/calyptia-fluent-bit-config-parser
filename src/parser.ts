import { v4 as uuidv4 } from 'uuid';
import { getFluentBitSchema } from './getSchema';
import { COMMANDS, type FluentBitSchemaType, FLUENTBIT_REGEX } from './constants';
import { isFluentBit, isValidCommand, isValidFluentBitSchemaType } from './guards';
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

export class FluentBitSchema {
  private _source: string;

  private _ast: FluentBitSchemaType[];
  constructor(source: string) {
    this._ast = parse(source);

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
