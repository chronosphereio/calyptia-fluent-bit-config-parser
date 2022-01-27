import { table } from 'table';
import { NO_STYLES_IN_TABLE } from './constants';

import type { FluentBitSchemaType } from './constants';

const PROP_DEFAULT_INDENT = 3;

const getIndent = (indent: number): string => Array.from({ length: indent }).join(' ');
export function schemaToString(configBlocks: FluentBitSchemaType[], { propIndent = PROP_DEFAULT_INDENT }): string {
  const data = [] as string[][];
  const spanningCells = [];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const { command, id, optional, ...rest } of configBlocks) {
    data.push([`\n[${command}]`, '']);
    spanningCells.push({ col: 0, row: 3, colSpan: 3 });

    for (const [key, value] of Object.entries({ ...rest, ...optional })) {
      data.push([`${getIndent(propIndent)}${key}`, String(value)]);
      spanningCells.push({ col: 0, row: 0, colSpan: 0 });
    }
  }

  return table(data, NO_STYLES_IN_TABLE);
}
