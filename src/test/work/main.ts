import { createRequire } from 'module';
import { createWorkFn } from '../../workerify';
// import dotenv from 'dotenv';

// dotenv.config();

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
    max_new_tokens: 60,
  };

  const stream = answer_sync(json);

  stream.on('data', (chunk) => {
    process.stdout.write(chunk);
    // process.stdout.write(Buffer.from(chunk).toString());
    // console.log(chunk.toString());
  });

  stream.on('end', () => {
    console.log('Finished reading data');
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
}

main();
