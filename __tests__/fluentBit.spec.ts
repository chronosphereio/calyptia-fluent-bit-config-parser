import { FluentBitSchema } from '../index';
import { cases } from '../__fixtures__/fluentBitCases';

jest.mock('uuid', () => ({ v4: () => 'UNIQUE' }));

describe('fluentBit', () => {
  it('Fails if config is empty', () => {
    expect(() => new FluentBitSchema('       ')).toThrowErrorMatchingInlineSnapshot('"Invalid Config file"');
  });

  it('Fails if config has no fields', () => {
    expect(() => new FluentBitSchema('# some comment')).toThrowErrorMatchingInlineSnapshot(
      '"We could not find fields in the configuration"'
    );
  });
  it('Fails if config has invalid commands', () => {
    expect(
      () =>
        new FluentBitSchema(`
    [INVALID]
        Name        tail
        Tag         tail.01
        Path        /var/log/system.log

    [OUTPUT]
        Name        splunk
        Match       *
        Host        127.0.0.1
        Port        8088
        TLS         On
        TLS.Verify  Off
        Message_Key my_key
    `)
    ).toThrowErrorMatchingInlineSnapshot(
      '"Command is not valid, we got INVALID, it should be OUTPUT,INPUT,FILTER,SERVICE,PARSER"'
    );
  });

  it('Should ignore new line comments on AST', () => {
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
    const config = new FluentBitSchema(rawConfig);
    expect(config.schema).toMatchInlineSnapshot(`
      Object {
        "config": Array [
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
        ],
      }
    `);
  });
  it.each(cases)('Parse config: %s', (_name, rawConfig, expected) => {
    const config = new FluentBitSchema(rawConfig);
    expect(config.schema).toMatchObject(expected);
  });

  it.each(cases)('Returns source: %s', (_name, rawConfig) => {
    const config = new FluentBitSchema(rawConfig);
    expect(config.source).toBe(rawConfig);
  });
  it('should transform schema to string for basic.conf', () => {
    const [, rawConfig] = cases[0];

    // We need to normalize given that SchemaToString will return values toLowerCase + spaces normalized.
    // const normalize = (config: string) => config.replace(/\s/g, '').toLocaleLowerCase();

    const config = new FluentBitSchema(rawConfig);

    expect(config.toString()).toMatchInlineSnapshot(`
      "[INPUT]
          name  tail # some comment
          tag  tail.01
          path  /var/log/system.log

      [OUTPUT]
          name  s3
          match  *
          bucket  your-bucket
          region  us-east-1
          store_dir  /home/ec2-user/buffer
          total_file_size  50M
          upload_timeout  10m

      [OUTPUT]
          name  splunk
          match  *
          host  127.0.0.1
          port  8088
          tls  On
          tls.verify  Off
          message_key  my_key"
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
