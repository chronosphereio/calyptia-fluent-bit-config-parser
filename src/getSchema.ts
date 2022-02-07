import type { FluentBitSchemaType } from './constants';
import { isCustomBlock, isValidFluentBitSchemaType } from './guards';
export const getFluentBitSchema = (ast: FluentBitSchemaType[]): FluentBitSchemaType[] => {
  const schema = ast.filter((block) => isValidFluentBitSchemaType(block) && !isCustomBlock(block));
  return schema.map((configNode) => {
    const { name, id, command, optional } = configNode;
    return { command, name, optional, id };
  });
};
