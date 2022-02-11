import { readFileSync } from 'fs';
import { FluentBitSchema } from '../index';
import { TokenError } from '../src/TokenError';

jest.mock('uuid', () => ({ v4: () => 'UNIQUE' }));
describe('Fluent Bit: Directives', () => {
  it('Not recognized  directives should fail ', () => {
    const filePath = '/__fixtures__/directives/directives/ephemeral.conf';
    const rawConfig = `
    @SET A=B
    @WHATEVER something that we do not have implemented/invalid. 

    [INPUT]
      name dummy
      dummy {"message":"\${A}"}

    `;

    try {
      new FluentBitSchema(rawConfig, filePath);
    } catch (e) {
      const error = e as TokenError;
      expect(error.message).toMatchInlineSnapshot(
        '"You have defined a Directive not supported (@WHATEVER something that we do not have implemented/invalid. ). The supported directives are: SET,INCLUDE"'
      );
      expect(error.formattedError).toMatchInlineSnapshot(
        '"/__fixtures__/directives/directives/ephemeral.conf: 3:5 You have defined a Directive not supported (@WHATEVER something that we do not have implemented/invalid. ). The supported directives are: SET,INCLUDE"'
      );
    }
    expect.hasAssertions();
  });
  describe('@INCLUDE', () => {
    it('Parses global @INCLUDES in configuration', () => {
      const filePath = './__fixtures__/directives/include/withIncludes.conf';
      const rawConfig = readFileSync(filePath, { encoding: 'utf-8' });
      const config = new FluentBitSchema(rawConfig, filePath);
      expect(config.directives).toMatchInlineSnapshot(`
        Array [
          Object {
            "col": 1,
            "filePath": "<PROJECT_ROOT>/__fixtures__/directives/include/nested/tail.conf",
            "line": 6,
            "lineBreaks": 0,
            "offset": 47,
            "text": "@include nested/tail.conf",
            "toString": [Function],
            "type": "INCLUDE",
            "value": "@INCLUDE nested/tail.conf",
          },
          Object {
            "col": 1,
            "filePath": "<PROJECT_ROOT>/__fixtures__/directives/include/nested/service.conf",
            "line": 8,
            "lineBreaks": 0,
            "offset": 136,
            "text": "@InClUdE nested/service.conf",
            "toString": [Function],
            "type": "INCLUDE",
            "value": "@INCLUDE nested/service.conf",
          },
        ]
      `);
      expect(config.AST).toMatchInlineSnapshot(`
              Array [
                Object {
                  "__filePath": "<PROJECT_ROOT>/__fixtures__/directives/include/nested/tail.conf",
                  "command": "INPUT",
                  "id": "UNIQUE",
                  "name": "tail",
                  "optional": Object {
                    "alias": "function_A_json_tail",
                    "parser": "json",
                    "path": "\${DEFAULT_LOGS_DIR}/some-json.log",
                    "path_key": "filename",
                    "refresh_interval": "10",
                    "skip_empty_lines": "On",
                    "skip_long_lines": "On",
                    "tag": "recommended.log.functionA",
                  },
                },
                Object {
                  "__filePath": "<PROJECT_ROOT>/__fixtures__/directives/include/nested/service.conf",
                  "command": "SERVICE",
                  "id": "UNIQUE",
                  "optional": Object {
                    "flush": "1",
                    "health_check": "On",
                    "http_port": "\${HTTP_PORT}",
                    "http_server": "On",
                    "log_level": "Debug",
                    "parsers_file": "/fluent-bit/etc/parsers/parsers-custom.conf",
                    "storage.metrics": "On",
                  },
                },
                Object {
                  "__filePath": "<PROJECT_ROOT>/__fixtures__/directives/include/withIncludes.conf",
                  "command": "OUTPUT",
                  "id": "UNIQUE",
                  "name": "loki",
                  "optional": Object {
                    "alias": "loki_output",
                    "host": "\${LOKI_HOST}",
                    "label_keys": "$file,$level",
                    "labels": "job=recommended-fluentbit",
                    "match": "\${LOKI_MATCH}",
                    "port": "\${LOKI_PORT}",
                    "workers": "1",
                  },
                },
              ]
          `);
    });
    it('Fails retrieving an @INCLUDE that contains more than a single path as a value', async () => {
      const filePath = '__fixtures__/directives/include/withWrongIncludeValue.conf';
      const rawConfig = readFileSync(filePath, { encoding: 'utf-8' });
      try {
        new FluentBitSchema(rawConfig, filePath);
      } catch (e) {
        expect(e).toBeInstanceOf(TokenError);
        const error = e as TokenError;
        expect(error.line).toBe(3);
        expect(error.col).toBe(1);
        expect(error.message).toMatchInlineSnapshot(
          '"You are trying to include nested/tail.conf, but we also found more arguments (shouldNotHaveAnytingElse). Includes can only have a single value (ex: @includes path/to/a/file)"'
        );
        expect(error.formattedError).toMatchInlineSnapshot(
          '"<PROJECT_ROOT>/__fixtures__/directives/include/withWrongIncludeValue.conf: 3:1 You are trying to include nested/tail.conf, but we also found more arguments (shouldNotHaveAnytingElse). Includes can only have a single value (ex: @includes path/to/a/file)"'
        );
        expect(error.filePath).toMatchInlineSnapshot(
          '"<PROJECT_ROOT>/__fixtures__/directives/include/withWrongIncludeValue.conf"'
        );
      }
    });
    it('Fails retrieving a repeated @INCLUDE (can not include file twice) ', async () => {
      const filePath = '__fixtures__/directives/include/withDuplicatedIncludes.conf';
      const rawConfig = readFileSync(filePath, { encoding: 'utf-8' });
      try {
        new FluentBitSchema(rawConfig, filePath);
      } catch (e) {
        expect(e).toBeInstanceOf(TokenError);
        const error = e as TokenError;
        expect(error.line).toBe(9);
        expect(error.col).toBe(1);
        expect(error.message).toMatchInlineSnapshot(
          '"You are trying to include <PROJECT_ROOT>/__fixtures__/directives/include/nested/tail.conf. Fluent Bit does not allow a file to be included twice in the same configuration"'
        );
        expect(error.formattedError).toMatchInlineSnapshot(
          '"<PROJECT_ROOT>/__fixtures__/directives/include/withDuplicatedIncludes.conf: 9:1 You are trying to include <PROJECT_ROOT>/__fixtures__/directives/include/nested/tail.conf. Fluent Bit does not allow a file to be included twice in the same configuration"'
        );
        expect(error.filePath).toMatchInlineSnapshot(
          '"<PROJECT_ROOT>/__fixtures__/directives/include/withDuplicatedIncludes.conf"'
        );
      }
    });
    it('Fails retrieving a missing @include (file not found) ', async () => {
      const filePath = './__fixtures__/directives/include/withFailingIncludes.conf';
      const rawConfig = readFileSync(filePath, { encoding: 'utf-8' });
      try {
        new FluentBitSchema(rawConfig, filePath);
      } catch (e) {
        expect(e).toBeInstanceOf(TokenError);
        const error = e as TokenError;
        expect(error.line).toBe(3);
        expect(error.col).toBe(1);
        expect(error.message).toMatchInlineSnapshot(
          '"Can not read file, loading from <PROJECT_ROOT>/__fixtures__/directives/include/withFailingIncludes.conf "'
        );
        expect(error.formattedError).toMatchInlineSnapshot(
          '"<PROJECT_ROOT>/__fixtures__/directives/include/nested/notExistentInclude.conf: 3:1 Can not read file, loading from <PROJECT_ROOT>/__fixtures__/directives/include/withFailingIncludes.conf "'
        );
        expect(error.filePath).toMatchInlineSnapshot(
          '"<PROJECT_ROOT>/__fixtures__/directives/include/nested/notExistentInclude.conf"'
        );
      }
    });
  });
  describe('@SET', () => {
    it('Parses @SET in configuration', () => {
      const filePath = './__fixtures__/directives/set/withSetVars.conf';
      const rawConfig = readFileSync(filePath, { encoding: 'utf-8' });
      const config = new FluentBitSchema(rawConfig, filePath);
      expect(config.directives).toMatchInlineSnapshot(`
        Array [
          Object {
            "col": 1,
            "filePath": "<PROJECT_ROOT>/__fixtures__/directives/set/withSetVars.conf",
            "line": 1,
            "lineBreaks": 0,
            "offset": 0,
            "text": "@SET A=some configuration here again",
            "toString": [Function],
            "type": "SET",
            "value": "@SET A=some configuration here again",
          },
          Object {
            "col": 1,
            "filePath": "<PROJECT_ROOT>/__fixtures__/directives/set/withSetVars.conf",
            "line": 2,
            "lineBreaks": 0,
            "offset": 37,
            "text": "@set C=some configuration here",
            "toString": [Function],
            "type": "SET",
            "value": "@SET C=some configuration here",
          },
        ]
      `);
      expect(config.AST).toMatchInlineSnapshot(`
        Array [
          Object {
            "__filePath": "<PROJECT_ROOT>/__fixtures__/directives/set/withSetVars.conf",
            "command": "INPUT",
            "id": "UNIQUE",
            "name": "dummy",
            "optional": Object {
              "dummy": "{\\"message\\":\\"\${A}\\"}",
            },
          },
          Object {
            "__filePath": "<PROJECT_ROOT>/__fixtures__/directives/set/withSetVars.conf",
            "command": "INPUT",
            "id": "UNIQUE",
            "name": "dummy",
            "optional": Object {
              "dummy": "{\\"message\\":\\"\${C}\\"}",
            },
          },
          Object {
            "__filePath": "<PROJECT_ROOT>/__fixtures__/directives/set/withSetVars.conf",
            "command": "OUTPUT",
            "id": "UNIQUE",
            "name": "stdout",
            "optional": Object {
              "match": "*",
            },
          },
        ]
      `);
    });

    it('Parses @SET in configuration (case insensitive)', () => {
      const filePath = '/__fixtures__/directives/set/ephemeral.conf';
      const rawConfig = `
      @Set A=A
      @SeT B=B
      @SEt C=C
      @seT D=D
      @sET E=E
      @sEt F=F
      
      [INPUT]
        name dummy
        dummy {"message":"\${A}"}
      `;
      const config = new FluentBitSchema(rawConfig, filePath);
      expect(config.directives).toMatchSnapshot();
    });
    it('Should fail when @SET directive  is malformed', () => {
      const filePath = '/__fixtures__/directives/set/ephemeral.conf';
      const rawConfig = `
      @SET A = some configuration here again =
      @set C=some configuration here
      
      [INPUT]
        name dummy
        dummy {"message":"\${A}"}
      
      `;

      try {
        new FluentBitSchema(rawConfig, filePath);
      } catch (e) {
        const error = e as TokenError;
        expect(error.message).toMatchInlineSnapshot(`
          "invalid syntax at line 2 col 7:

                  @SET A = some configuration here again =
                  ^"
        `);
      }
    });

    it('Should add the @SET directive when calling toString()', () => {
      const filePath = '/__fixtures__/directives/set/ephemeral.conf';
      const rawConfig = `
      @SET A=some configuration here again =
      @set C=some configuration here
      
      [INPUT]
        name dummy
        dummy {"message":"\${A}"}
      `;

      const config = new FluentBitSchema(rawConfig, filePath);
      expect(config.toString()).toMatchInlineSnapshot(`
        "
        @SET A=some configuration here again =

        @SET C=some configuration here
                                   
        [INPUT]                    
          name  dummy              
          dummy {\\"message\\":\\"\${A}\\"} 
        "
      `);
    });
  });
});
