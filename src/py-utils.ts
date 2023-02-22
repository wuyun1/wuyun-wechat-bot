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

export const answer_sync = (options: answer_syncOptions = {}) => {
  const { text, max_new_tokens = 40, ...otherOptions } = options;

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
  let count = 0;

  setTimeout(() => {
    try {
      const output = answer.answer(
        boa.kwargs({
          ...otherOptions,
          text: prompt,

          prefix_allowed_tokens_fn: (_, input_ids) => {
            count++;
            if (count > 1) {
              // const chunk = boa.eval`${input_ids}[-1:]`;
              // const chunk = input_ids;
              const str = boa.eval`${answer.postprocess}(${answer.tokenizer}.decode(${input_ids}[-1:]))`;
              // answer.postprocess(answer.tokenizer.decode(chunk));
              // console.log({ str })
              stream.dataSource.push(str);
              stream._read();
            }
            if (isDone) {
              throw Error('end');
            }
          },

          sample: true,

          max_new_tokens,
        })
      );
      isDone = true;
      // console.log(`output: ${output}`)
      stream.dataSource.push(output);
      stream._read();
      stream._read();
    } catch (error) {
      // console.error('asdfasf23412341324afsd');
      // console.error(error);
      isDone = true;
      stream._read();
      stream._read();
    }
  }, 0);

  return stream;
};

export const pdf_to_word = (inputFile: string, outputFile: string) => {
  const testUtils = boa.import('app.pdf');
  testUtils.pdf_to_word(inputFile, outputFile);
};
