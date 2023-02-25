import { createRequire } from 'module';
import { createWorkFn } from '../../workerify';
// import dotenv from 'dotenv';

// dotenv.config();

// export const delay = (t = 0) => {
//   return new Promise((re) => {
//     setTimeout(() => {
//       re(null);
//     }, t);
//   });
// };

const require = createRequire(import.meta.url);

async function main() {
  // const createReadableStream = createWorkFn({
  //   workFile: require.resolve('./utils.ts'),
  //   functionName: 'createReadableStream',
  // });

  const answer_sync = createWorkFn({
    workFile: require.resolve('../../py-utils.ts'),
    returnType: 'stream',
    functionName: 'answer_sync',
  });

  const json = {
    text: '用户: 写首诗\n小元:',
    max_new_tokens: 160,
  };

  const stream = answer_sync(json);

  stream.on('data', (chunk) => {
    process.stdout.write(chunk);
    // process.stdout.write(Buffer.from(chunk).toString());
    // console.log(chunk.toString());
  });

  let _reject, _resolve;

  const p = new Promise((resolve, reject) => {
    _reject = reject;
    _resolve = resolve;
  });

  stream.on('end', () => {
    console.log();
    console.log('Finished reading data');
    _resolve(null);
    // process.exit();
  });

  stream.on('error', (err) => {
    console.log();
    console.log('Error reading data', err);
    _reject(err);
    // process.exit();
  });

  // const answer = createWorkFn({
  //   workFile: require.resolve('../../py-utils.ts'),
  //   // returnType: 'stream',
  //   functionName: 'answer',
  // });

  // const json2 = {
  //   text: '用户: 写首诗\n小元:',
  //   max_new_tokens: 60,
  // };

  // const res = await answer(json2);
  // console.log(`res: ${res}`);

  await p;

  console.log(`begin exit`);

  // await delay(3000);

  // process.exit();
}

main();
