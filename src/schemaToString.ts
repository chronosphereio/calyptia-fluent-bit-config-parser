import type { FluentBitSchemaType } from './constants';

const NEW_CHAR = '\n' + ' ' + ' ' + ' ' + ' ';
export function schemaToString(configValues: FluentBitSchemaType[]) {
  const blocks = configValues.map((values) => {
    // destructuring id to avoid having it in the final output.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { command, id, ...rest } = values;
    const properties = Object.entries(rest).reduce((memo, [key, value]) => `${memo}${NEW_CHAR}${key}  ${value}`, '');

    return [`[${command.toUpperCase()}]`, properties].join('');
  });
  return blocks.join('\n\n');
}
