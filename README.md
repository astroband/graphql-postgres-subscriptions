# Graphql Postgres Subscriptions
[![Build Status](https://img.shields.io/travis/com/astroband/graphql-postgres-subscriptions/master.svg)](https://travis-ci.com/astroband/graphql-postgres-subscriptions)
[![Codecov](https://shields.alexander-wong.com/codecov/c/github/udia-software/graphql-postgres-subscriptions.svg?style=flat-square)](https://codecov.io/gh/udia-software/graphql-postgres-subscriptions)
[![David](https://shields.alexander-wong.com/david/udia-software/graphql-postgres-subscriptions.svg?style=flat-square)](https://david-dm.org/udia-software/graphql-postgres-subscriptions)

GraphQL PubSubEngine implementation using Postgres `NOTIFY`, `LISTEN`, and `UNLISTEN`.

## Quickstart

This package has peer dependencies with [brianc/node-postgres](https://github.com/brianc/node-postgres) (`pg`) and [graphql/graphql-js](https://github.com/graphql/graphql-js) (`graphql`).

**Install the package:**
  - `yarn add @udia/graphql-postgres-subscriptions`
  - `npm install @udia/graphql-postgres-subscriptions --save`

**Sample PostgresPubSub Usage**

```js
import PostgresPubSub from '@udia/graphql-postgres-subscriptions';
import { Client } from 'pg'

// create your postgres client and connect to the database
const pgClient = new Client({ ...pgClientOptions });
await pgClient.connect();

// Instantiate your PubSub engine
const pubSub = new PostgresPubSub(pgClient);
```

**Optional, pass in JSON Reviver**

```js
// Optional JSON reviver function
const dateReviver = (key: any, value: any) => {
  const isISO8601Z = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/;
  if (typeof value === "string" && isISO8601Z.test(value)) {
    const tempDateNumber = Date.parse(value);
    if (!isNaN(tempDateNumber)) {
      return new Date(tempDateNumber);
    }
  }
  return value;
};
const pubSub = new PostgresPubSub(pgClient, dateReviver);
pubSub.publish("date", new Date()); // will notify with Date instead of string
```

## Testing/Development

This project performs integration tests with a postgres database. This can be run with Docker by executing: `docker-compose build && docker-compose run test` or this can be run with a standalone postgres database by configuring your environment variables in [testHelper.ts](__tests__/testHelper.ts).

## About

- Written in TypeScript, static type guarantees
- Inspired by [GraphQLCollege/graphql-postgres-subscriptions](https://github.com/GraphQLCollege/graphql-postgres-subscriptions) 
- Removed dependency on [emilbayes/pg-ipc](https://github.com/emilbayes/pg-ipc) due to JSON reviving functionality
- Full implementation example and app demo at [udia-software/udia](https://github.com/udia-software/udia)

## License

This is [free software](https://www.gnu.org/philosophy/free-sw.en.html), licensed under MIT License.

```text
The MIT License

Copyright (c) 2018 Udia Software Incorporated

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
