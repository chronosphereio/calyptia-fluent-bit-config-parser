import type { FluentBitSchemaType } from './constants';
export const getFluentBitSchema = (ast: FluentBitSchemaType[]): { config: FluentBitSchemaType[] } => {
  return {
    config: ast.map((configNode) => {
      const { name, id, command, ...optional } = configNode;
      return { command, name, optional, id };
    }),
  };
};
