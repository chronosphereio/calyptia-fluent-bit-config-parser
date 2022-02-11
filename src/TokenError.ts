export class TokenError extends Error {
  line: number;
  col: number;
  message: string;

  filePath: string;
  constructor(message: string, filePath: string, line: number, col: number) {
    super(message);
    this.name = 'TokenError';
    this.message = message;
    this.filePath = filePath;
    this.line = line;
    this.col = col;
  }

  get formattedError() {
    return `${this.filePath}: ${this.line}:${this.col} ${this.message}`;
  }
}
