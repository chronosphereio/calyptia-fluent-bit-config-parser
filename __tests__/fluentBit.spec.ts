import { readFileSync } from 'fs';
import { FluentBitSchema } from '../index';
import { TokenError } from '../src/TokenError';
import { cases } from '../__fixtures__/fluentBitCases';

jest.mock('uuid', () => ({ v4: () => 'UNIQUE' }));

describe('fluentBit', () => {
  describe('Basic features', () => {
    it('Should ignore new line comments on the Schema', () => {
      const rawConfig = `
    [INPUT]
        # new line comment
        Name        tail
        Tag         tail.01
        Path        /var/log/system.log

    [OUTPUT]
        Name s3
        Match *
        bucket your-bucket
        region us-east-1
        store_dir /home/ec2-user/buffer
        total_file_size 50M
        upload_timeout 10m 
    `;
      const config = new FluentBitSchema(rawConfig, '/file/path.conf');
      expect(config.schema).toMatchInlineSnapshot(`
        Array [
          Object {
            "command": "INPUT",
            "id": "UNIQUE",
            "name": "tail",
            "optional": Object {
              "path": "/var/log/system.log",
              "tag": "tail.01",
            },
          },
          Object {
            "command": "OUTPUT",
            "id": "UNIQUE",
            "name": "s3",
            "optional": Object {
              "bucket": "your-bucket",
              "match": "*",
              "region": "us-east-1",
              "store_dir": "/home/ec2-user/buffer",
              "total_file_size": "50M",
              "upload_timeout": "10m",
            },
          },
        ]
    `);
    });
    it('Fails if config has no fields', () => {
      expect(() => new FluentBitSchema('# some comment', '/file/path.conf')).toThrowErrorMatchingInlineSnapshot(
        '"/file/path.conf: 0:0 This file is not a valid Fluent Bit config file"'
      );
    });
    it('Fails if config is empty', () => {
      expect(() => new FluentBitSchema('       ', '/file/path.conf')).toThrowErrorMatchingInlineSnapshot(
        '"/file/path.conf: 0:0 File is empty"'
      );
    });

    it('Should transform schema to string for basic.conf', () => {
      const [filePath, rawConfig] = cases[0];

      // We need to normalize given that SchemaToString will return values toLowerCase + spaces normalized.
      // const normalize = (config: string) => config.replace(/\s/g, '').toLocaleLowerCase();

      const config = new FluentBitSchema(rawConfig, filePath);

      expect(config.toString()).toMatchInlineSnapshot(`
      "                                                                   
      [INPUT]                                                            
        name            tail # some comment                              
        tag             tail.01                                          
        path            /var/log/system.log                              
                                                                         
      [OUTPUT]                                                           
        name            s3                                               
        match           *                                                
        bucket          your-bucket                                      
        region          us-east-1                                        
        store_dir       /home/ec2-user/buffer                            
        total_file_size 50M                                              
        upload_timeout  10m                                              
                                                                         
      [OUTPUT]                                                           
        name            splunk                                           
        match           *                                                
        host            127.0.0.1                                        
        port            8088                                             
        tls             On                                               
        tls.verify      Off                                              
        message_key     my_key                                           
        add_label       pipeline_id a21fd551-095b-4271-acf0-c2fdb3161b84 
      "
    `);
    });
    it.each(cases)('is %s, fluent-bit configuration?', (_name, rawConfig) => {
      expect(FluentBitSchema.isFluentBitConfiguration(rawConfig)).toBe(true);
    });

    it('fluentD.conf should not be fluent-bit configuration', () => {
      const fluentDConfig = `
    #  Receive events from 24224/tcp
    # This is used by log forwarding and the fluent-cat command
    <source>
      @type forward
      port 24224
    </source>
    
    # http://<ip>:9880/myapp.access?json={"event":"data"}
    <source>
      @type http
      port 9880
    </source>
    
    # Match events tagged with "myapp.access" and
    # store them to /var/log/fluent/access.%Y-%m-%d
    # Of course, you can control how you partition your data
    # with the time_slice_format option.
    <match myapp.access>
      @type file
      path /var/log/fluent/access
    </match>
`;
      expect(FluentBitSchema.isFluentBitConfiguration(fluentDConfig)).toBe(false);
    });
  });

  describe('Parse cases', () => {
    it.each(cases)('Parse config: %s', (filePath, rawConfig, expected) => {
      const config = new FluentBitSchema(rawConfig, filePath);
      expect(config.filePath).toMatch(filePath);
      expect(config.schema).toMatchObject(expected.config);
    });

    it.each(cases)('Returns source: %s', (filePath, rawConfig) => {
      const config = new FluentBitSchema(rawConfig, filePath);
      expect(config.source).toBe(rawConfig);
    });
  });

  describe('Directive: @includes', () => {
    it('Parses global @includes in configuration', async () => {
      const filePath = './__fixtures__/includes/withIncludes.conf';
      const rawConfig = readFileSync(filePath, { encoding: 'utf-8' });
      const config = new FluentBitSchema(rawConfig, filePath);
      expect(config.AST).toMatchInlineSnapshot(`
      Array [
        Object {
          "__filePath": "<PROJECT_ROOT>/__fixtures__/includes/nested/tail.conf",
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
          "__filePath": "<PROJECT_ROOT>/__fixtures__/includes/nested/service.conf",
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
          "__filePath": "<PROJECT_ROOT>/__fixtures__/includes/withIncludes.conf",
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
    it('Fails retrieving an include that contains more than a single path as a value', async () => {
      const filePath = '__fixtures__/includes/withWrongIncludeValue.conf';
      const rawConfig = readFileSync(filePath, { encoding: 'utf-8' });
      try {
        new FluentBitSchema(rawConfig, filePath);
      } catch (e) {
        expect(e).toBeInstanceOf(TokenError);
        const error = e as TokenError;
        expect(error.line).toBe(3);
        expect(error.col).toBe(1);
        expect(error.message).toMatchInlineSnapshot(
          '"<PROJECT_ROOT>/__fixtures__/includes/withWrongIncludeValue.conf: 3:1 You are trying to include nested/tail.conf, but we also found more arguments (shouldNotHaveAnytingElse). Includes can only have a single value (ex: @includes path/to/a/file)"'
        );
        expect(error.filePath).toMatchInlineSnapshot(
          '"<PROJECT_ROOT>/__fixtures__/includes/withWrongIncludeValue.conf"'
        );
      }
    });
    it('Fails retrieving a repeated include (can not include file twice) ', async () => {
      const filePath = '__fixtures__/includes/withDuplicatedIncludes.conf';
      const rawConfig = readFileSync(filePath, { encoding: 'utf-8' });
      try {
        new FluentBitSchema(rawConfig, filePath);
      } catch (e) {
        expect(e).toBeInstanceOf(TokenError);
        const error = e as TokenError;
        expect(error.line).toBe(9);
        expect(error.col).toBe(1);
        expect(error.message).toMatchInlineSnapshot(
          '"<PROJECT_ROOT>/__fixtures__/includes/withDuplicatedIncludes.conf: 9:1 You are trying to include <PROJECT_ROOT>/__fixtures__/includes/nested/tail.conf. Fluent Bit does not allow a file to be included twice in the same configuration"'
        );
        expect(error.filePath).toMatchInlineSnapshot(
          '"<PROJECT_ROOT>/__fixtures__/includes/withDuplicatedIncludes.conf"'
        );
      }
    });
    it('Fails retrieving a missing include (file not found) ', async () => {
      const filePath = './__fixtures__/includes/withFailingIncludes.conf';
      const rawConfig = readFileSync(filePath, { encoding: 'utf-8' });
      try {
        new FluentBitSchema(rawConfig, filePath);
      } catch (e) {
        expect(e).toBeInstanceOf(TokenError);
        const error = e as TokenError;
        expect(error.line).toBe(3);
        expect(error.col).toBe(1);
        expect(error.message).toMatchInlineSnapshot(
          '"<PROJECT_ROOT>/__fixtures__/includes/nested/notExistentInclude.conf: 3:1 Can not read file, loading from <PROJECT_ROOT>/__fixtures__/includes/withFailingIncludes.conf "'
        );
        expect(error.filePath).toMatchInlineSnapshot(
          '"<PROJECT_ROOT>/__fixtures__/includes/nested/notExistentInclude.conf"'
        );
      }
    });
  });

  it('Simpler section to tokens.', async () => {
    const filePath = '/nowhere/ephemeral.conf';
    const rawConfig = `
    [INPUT]
      Name        tail # some comment
      Tag         tail.01
      Path        /var/log/system.log
    `;

    const config = new FluentBitSchema(rawConfig, filePath);
    const ast = config.AST;

    expect(config.getTokensBySectionId(ast[0].id)).toMatchSnapshot();
  });
  it('Retrieves the right tokens set from the given section.', async () => {
    const filePath = '__fixtures__/basic/basic.conf';
    const rawConfig = readFileSync(filePath, { encoding: 'utf-8' });

    const config = new FluentBitSchema(rawConfig, filePath);
    const ast = config.AST;

    expect(config.getTokensBySectionId(ast[1].id)).toMatchSnapshot();
  });
});
