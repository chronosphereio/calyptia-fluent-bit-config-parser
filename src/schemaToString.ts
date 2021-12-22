import type { FluentBitSchemaType } from './constants';

const NEW_CHAR = '\n' + ' ' + ' ' + ' ' + ' ';

const propToConfigParam = (key: string, value: unknown): string => `${NEW_CHAR}${key}  ${value}`;

export function schemaToString(configValues: FluentBitSchemaType[]) {
  const blocks = configValues.map((values) => {
    // destructuring id to avoid having it in the final output.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { command, id, optional, ...rest } = values;
    const properties = Object.entries({ ...rest, ...optional }).reduce(
      (memo, [key, value]) => `${memo}${propToConfigParam(key, value)}`,
      ''
    );

    return [`[${command.toUpperCase()}]`, properties].join('');
  });

  return blocks.join('\n\n');
}
