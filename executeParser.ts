#! usr/bin/env node

import fs from 'fs';
import { FluentBitSchema } from './index';

const file = fs.readFileSync('./__fixtures__/basic.conf', { encoding: 'utf-8' });

// const schema = new FluentBitSchema(`
// [INPUT]
//     # Comment explaining property
//     Name        tail # some comment
//     Tag         tail.01
//     Path        /var/log/system.log

// [OUTPUT]
//     Name s3
//     Match *
//     bucket your-bucket
//     region us-east-1
//     store_dir /home/ec2-user/buffer
//     total_file_size 50M
//     upload_timeout 10m
// `);

const config = new FluentBitSchema(file);
console.log(config.source);

console.log(JSON.stringify(config.schema, null, 2));

console.log('======', '\n', config.toString());
