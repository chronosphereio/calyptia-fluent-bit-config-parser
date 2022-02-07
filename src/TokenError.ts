const formatError = (message: string, filePath: string, line: number, col: number): string =>
  `${filePath}: ${line}:${col} ${message}`;
export class TokenError extends Error {
  line: number;
  col: number;
  message: string;

  filePath: string;
  constructor(message: string, filePath: string, line: number, col: number) {
    super(formatError(message, filePath, line, col));
    this.name = 'TokenError';
    this.message = message;
    this.filePath = filePath;
    this.line = line;
    this.col = col;
  }
}
