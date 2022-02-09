import { table } from 'table';
import { type FluentBitSection, NO_STYLES_IN_TABLE, FluentBitToken } from './constants';

const PROP_DEFAULT_INDENT = 3;

const getIndent = (indent: number): string => Array.from({ length: indent }).join(' ');
export function schemaToString(
  configBlocks: FluentBitSection[],
  directives: FluentBitToken[],
  { propIndent = PROP_DEFAULT_INDENT }
): string {
  const data = [] as string[][];
  const spanningCells = [];

  const renderDirectives = [];
  if (directives.length) {
    for (const { value } of directives) {
      renderDirectives.push(`\n${value}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const { command, id, optional, ...rest } of configBlocks) {
    data.push([`\n[${command}]`, '']);
    spanningCells.push({ col: 0, row: 3, colSpan: 3 });

    for (const [key, value] of Object.entries({ ...rest, ...optional })) {
      data.push([`${getIndent(propIndent)}${key}`, String(value)]);
      spanningCells.push({ col: 0, row: 0, colSpan: 0 });
    }
  }

  return [renderDirectives.join('\n'), table(data, NO_STYLES_IN_TABLE)].join('\n');
}
