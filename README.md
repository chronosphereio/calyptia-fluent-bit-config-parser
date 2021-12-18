<p align="center">
    <a href="https://github.com/calyptia/fluent-bit-config-parser/actions/workflows/validation.yml">
      <img src="https://github.com/calyptia/fluent-bit-config-parser/actions/workflows/validation.yml/badge.svg" alt="Validation" />
    </a>
    <a href="https://codecov.io/gh/calyptia/fluent-bit-config-parser">
      <img src="https://codecov.io/gh/calyptia/fluent-bit-config-parser/branch/main/graph/badge.svg?token=48gHuQl8zV" alt="codecov" />
    </a>
    <a href="https://github.com/calyptia/fluent-bit-config-parser//blob/main/LICENSE">
      <img src="https://img.shields.io/github/license/calyptia/fluent-bit-config-parser" alt="APACHE 2.0 license" />
    </a>
</p>

<p align="center">
  <a href="https://github.com/calyptia/fluent-bit-config-parser">
    <img src="images/logo.png" alt="Logo" width="128" height="128">
  </a>

</p>

Configuration parser for [Fluent-bit](https://github.com/fluent/fluent-bit)

## Table of Contents

- [Getting Started](#getting-started)
  - [How to import](#how-to-import)
  - [Use Cases](#use-cases)
- [Contributing](#contributing)
- [License](#license)

## Getting Started

Getting Started

fluent-bit configuration parser will allow you to validate some aspects of fluent-bit configuration.

for more information about fluent-bit configuration you can visit [fluent-bit website](https://docs.fluentbit.io/manual/administration/configuring-fluent-bit/configuration-file).

### How to import

You can import the parser as follows:

```typescript
import { FluentBitSchema } from '@calyptia/fluent-bit-config-parser';
```

This library offers a couple of methods:

`schema`: it will return the parsed configuration as a fluent-bit schema.

`toString()`: it will return the parsed schema, back to a string

`source`: it will return the config as it was provided.

`FluentBitSchema.isFluentBitConfiguration`: A static method, to validate if the configuration is fluentBit. It's important to notice, that this method, will not confirm if the provided config is valid. For that please see below:

## Use cases.

### I have a file, but I'm not sure if is fluent-bit or Fluentd:

```typescript
import fs from 'fs';

import { FluentBitSchema } from '@calyptia/fluent-bit-config-parser';

const file = fs.readFileSync('/path/to/file.conf', { encoding: 'utf-8' });

console.log(FluentBitSchema.isFluentBitConfiguration(file)); // => true/false
```

### I want to confirm if my `fluent-bit` configuration is valid:

```typescript
import fs from 'fs';

import { FluentBitSchema } from '@calyptia/fluent-bit-config-parser';

const file = fs.readFileSync('/path/to/file.conf', { encoding: 'utf-8' });

try {
  const config = new FluentBitSchema(file);
  console.log('yay! my configuration is valid');
} catch (e) {
  console.log(e.message); // this message will provide some insight int what went wrong.
}
```

### I would like to re-format my configuration.

```typescript
import fs from 'fs';

import { FluentBitSchema } from '@calyptia/fluent-bit-config-parser';

const file = fs.readFileSync('/path/to/file.conf', { encoding: 'utf-8' });

const config = new FluentBitSchema(file);

console.log(config.toString());
```

<!-- CONTRIBUTING -->

## Contributing

Contributions are what makes the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<!-- LICENSE -->

## License

Distributed under the MIT License. See `LICENSE` for more information.
