import type { FluentBitToken } from './constants';

export class TokenIndex {
  private map: Map<string, FluentBitToken[]>;
  constructor() {
    this.map = new Map();
  }
  clear() {
    this.map = new Map();
  }
  get(tokenId: string) {
    return this.map.get(tokenId);
  }
  set(tokenId: string, value: FluentBitToken) {
    const tokens = this.map.get(tokenId);
    if (tokens) {
      tokens.push(value);
    } else {
      this.map.set(tokenId, [value]);
    }

    return this;
  }
}
