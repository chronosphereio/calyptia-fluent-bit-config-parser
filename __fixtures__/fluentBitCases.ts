import fs from 'fs';
import { COMMANDS, FluentBitSchemaType } from '../src/constants';

type Case = [name: string, content: string, SchemaAST: { config: FluentBitSchemaType[] }];

export const cases: Case[] = [
  [
    './__fixtures__/basic.conf',
    fs.readFileSync('./__fixtures__/basic.conf', { encoding: 'utf8' }),
    {
      config: [
        {
          command: COMMANDS.INPUT,
          name: 'tail',
          optional: {
            tag: 'tail.01',
            path: '/var/log/system.log',
          },
          id: 'UNIQUE',
        },
        {
          command: COMMANDS.OUTPUT,
          name: 's3',
          optional: {
            match: '*',
            bucket: 'your-bucket',
            region: 'us-east-1',
            store_dir: '/home/ec2-user/buffer',
            total_file_size: '50M',
            upload_timeout: '10m',
          },
          id: 'UNIQUE',
        },
        {
          command: COMMANDS.OUTPUT,
          name: 'splunk',
          optional: {
            match: '*',
            host: '127.0.0.1',
            port: '8088',
            tls: 'On',
            'tls.verify': 'Off',
            message_key: 'my_key',
          },
          id: 'UNIQUE',
        },
      ],
    },
  ],
  [
    './__fixtures__/basic2.conf',
    fs.readFileSync('./__fixtures__/basic2.conf', { encoding: 'utf8' }),
    {
      config: [
        {
          command: COMMANDS.INPUT,
          name: 'forward.0',
          optional: {
            tag: 'forward.0',
            buffer_chunk_size: '1M',
            buffer_max_size: '6M',
          },
          id: 'UNIQUE',
        },
        {
          command: COMMANDS.OUTPUT,
          name: 'stdout.0',
          optional: {
            match: '*',
            retry_limit: '1',
          },
          id: 'UNIQUE',
        },
      ],
    },
  ],
  [
    './__fixtures__/basic3.conf',
    fs.readFileSync('./__fixtures__/basic3.conf', { encoding: 'utf8' }),
    {
      config: [
        {
          command: COMMANDS.INPUT,
          name: 'Tail',
          optional: {
            tag: 'kube.*',
            path: '/foo',
          },
          id: 'UNIQUE',
        },
        {
          command: COMMANDS.OUTPUT,
          name: 'Splunk',
          optional: {
            match: 'kube*audit',
            splunk_token: 'foo',
          },
          id: 'UNIQUE',
        },
        {
          command: COMMANDS.OUTPUT,
          name: 'kinesis_firehose',
          optional: {
            region: 'oregon',
            delivery_stream: 'foo',
            match: 'kube.*',
          },
          id: 'UNIQUE',
        },
        {
          command: COMMANDS.FILTER,
          name: 'kubernetes',
          optional: {
            match: 'kube*',
          },
          id: 'UNIQUE',
        },
      ],
    },
  ],
  [
    './__fixtures__/basic4.conf',
    fs.readFileSync('./__fixtures__/basic4.conf', { encoding: 'utf-8' }),
    {
      config: [
        {
          command: COMMANDS.INPUT,
          name: 'tail',
          optional: {
            alias: 'erlang_tail',
            path: 'babysitter.log,debug.log,reports.log',
            multiline: 'On',
            parser_firstline: 'couchbase_erlang_multiline',
            refresh_interval: '10',
            skip_long_lines: 'On',
            skip_empty_lines: 'On',
            path_key: 'filename',
            tag: 'couchbase.log.<logname>',
            tag_regex: '${COUCHBASE_LOGS}/(?<logname>[^.]+).log$',
          },
          id: 'UNIQUE',
        },
      ],
    },
  ],
];
