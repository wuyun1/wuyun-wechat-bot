import readlineApi from 'readline';

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

export const delay = (t = 0) => {
  return new Promise((re) => {
    setTimeout(() => {
      re(null);
    }, t);
  });
};

import { answer_sync } from '../src/py-utils';

export async function main() {
  let input = ' hello';
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (input === 'q') {
      break;
    }

    const s: any = answer_sync({
      text: input,
      max_new_tokens: 10,
      // eos_token_id: 0,
      // pad_token_id: 0,
    });

    process.stdout.write('AI: ');

    // const generator = s();

    // // console.log(generator);

    // // You can use typical next syntax
    // let curr = await generator.next();

    // while (curr.done) {
    //   process.stdout.write(curr.value);
    //   // console.log(curr.value); // 3 2 1 0
    //   curr = await generator.next();
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

    delay(3000).then(() => {
      _resolve(null);
    });

    await p;

    console.log();

    do {
      input = await question('User: ');
    } while (input.trim() === '');
  }

  readline.close();
  process.exit();
}

main();
