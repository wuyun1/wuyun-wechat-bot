import boa from '@waynew/boa';
import { Readable } from 'stream';

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

export const answer = (options: answer_syncOptions = {}) => {
  const answer = boa.import('app.answer');

  const { text, max_new_tokens = 40, ...otherOptions } = options;

  const output = answer.answer(
    boa.kwargs({
      ...otherOptions,
      text,

      sample: true,

      max_new_tokens,
    })
  );

  return output;
};

export const answer_sync = (options: answer_syncOptions = {}) => {
  const answer = boa.import('app.answer');

  const { text, max_new_tokens = 40, ...otherOptions } = options;

  // return answer.answer(
  //   boa.kwargs({
  //     // ondata: true,
  //     sample: true,
  //     ...otherOptions,
  //     text,
  //     max_new_tokens,
  //   })
  // );

  let isDone = false;

  const stream = new Readable({
    objectMode: true,
    read() {
      // console.log({ args });
      // return 'hee';
      // no thing
    },
    destroy() {
      isDone = true;
    },
    autoDestroy: true,
  });

  const task = () => {
    const prompt = text;
    try {
      const output = answer.answer(
        boa.kwargs({
          sample: true,
          ...otherOptions,
          text: prompt,
          ondata: (data) => {
            if (isDone || typeof data !== 'string') {
              throw Error('end');
            }
            stream.push(data);
          },
          max_new_tokens,
        })
      );

      stream.push(output);
    } catch (error) {
      // console.error(error);
      // isDone = true;
      // stream.push(null);
    } finally {
      isDone = true;
      stream.push(null);
      // setTimeout(() => {
      //   isDone = true;
      //   stream.push(null);
      // }, count * 10);
    }
  };

  // nextTick(task);
  // task();

  setTimeout(task, 0);

  return stream;
};

export const pdf_to_word = (inputFile: string, outputFile: string) => {
  const testUtils = boa.import('app.pdf');
  testUtils.pdf_to_word(inputFile, outputFile);
};
