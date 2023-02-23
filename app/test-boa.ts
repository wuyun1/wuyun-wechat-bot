import boa from '@waynew/boa';
import { Readable } from 'stream';
import readlineApi from 'readline';

// const sys = boa.import('sys');
// console.log(`sys pythonpath: ${sys.path}`);

// const testUtils = boa.import('app.test-utils');

// testUtils.sum(3, 4, (c) => {
//   console.log(`c === ${c}`);
//   // throw new Error('asfs');
//   return `hadfasdfasdf`;
// });

interface answer_syncOptions {
  max_new_tokens?: number;
  [key: string]: any;
}

export const answer_sync = (text, options: answer_syncOptions = {}) => {
  const { max_new_tokens = 40, ...otherOptions } = options;

  let isDone = false;

  // 定义一个自定义的可读流
  class MyReadableStream extends Readable {
    dataSource: any[];

    constructor(dataSource?: any[]) {
      super();
      this.dataSource = dataSource || [];
    }

    _read() {
      const data = this.dataSource.shift() || null;
      // console.log({ data })
      if (data) {
        this.push(data);
        return;
      } else if (isDone) {
        this.push(null);
        return;
      } else {
        // todo wait data
      }
    }
  }

  const stream = new MyReadableStream();

  const answer = boa.import('app.answer');

  const prompt = text;

  setTimeout(() => {
    try {
      const res = answer.answer(
        boa.kwargs({
          sample: true,
          ...otherOptions,
          text: prompt,
          ondata: (data) => {
            console.log({ data });
            if (!data) {
              isDone = true;
              stream._read();
              return;
            }
            stream.dataSource.push(data);
            stream._read();
            if (isDone) {
              throw Error('end');
            }
          },
          max_new_tokens,
        })
      );
      console.log({ res });
    } catch (error) {
      // console.error('asdfasf23412341324afsd');
      // console.error(error);
      isDone = true;
      stream._read();
    }
  }, 0);

  return stream;
};

export const readline = readlineApi.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export const question = (prompt): Promise<string> => {
  return new Promise((resolve) => {
    readline.question(prompt, resolve);
  });
};

// const flush = (data = '') => {
//   return new Promise(resolve => {
//     process.stdout.write(data, resolve);
//   });
// }

// const delay = (timeout = 0) => {
//   return new Promise(resolve => {
//     setTimeout(() => { resolve(null) }, timeout)
//   });
// }

export async function main() {
  let input = '';
  // eslint-disable-next-line no-constant-condition
  while (true) {
    input = await question('User: ');

    if (input === 'q') {
      break;
    }
    if (input.trim() === '') {
      continue;
    }

    const s = answer_sync(input, {
      max_new_tokens: 10,
      // eos_token_id: 0,
      // pad_token_id: 0,
    });

    process.stdout.write('AI: ');

    // for await (const chunk of s) {
    //   // process.stdout.write(chunk);
    //   await flush(chunk);
    //   await delay(500);
    //   // await flush(chunk);
    // }

    s.on('data', (chunk) => {
      process.stdout.write(chunk);
      // flush();
    });

    let _resolve: any = null;
    const p = new Promise((resolve) => {
      _resolve = resolve;
    });

    s.on('end', () => {
      _resolve(null);
    });

    s.on('error', () => {
      _resolve(null);
    });

    s.on('close', () => {
      _resolve(null);
    });

    await p;

    console.log();
  }

  readline.close();
  process.exit();
}

main();
