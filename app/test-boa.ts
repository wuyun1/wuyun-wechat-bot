import boa from '@pipcook/boa';
import { mkdirSync } from 'fs';

const os = boa.import('os');

const pdf = boa.import('app.pdf');
// console.log(aaa.pdf_to_word);

// const test22 = boa.import('app.test22');
// console.log(test22.sum);
if (!os.path.exists('./word')) {
  // os.makedirs(
  //   './word',
  //   boa.kwargs({
  //     mode: 0x777,
  //     exist_ok: false,
  //   })
  // );
  mkdirSync('./word');
}

pdf.pdf_to_word('./pdf/aaa.pdf', './word/xxxx.docx');

const answer = boa.import('app.answer');
console.log(answer);

for (let index = 0; index < 10; index++) {
  const prompt = 'hello';

  const output = answer.answer(
    boa.kwargs({
      text: prompt,
      sample: true,
      max_new_tokens: 40,
    })
  );

  console.log(`${prompt}:${output}`);

  console.log('='.repeat(20));
}

// console.log(os.getpid()); // prints the pid from python.

// // using keyword arguments namely `kwargs`
// os.makedirs(
//   '..',
//   boa.kwargs({
//     mode: 0x777,
//     exist_ok: false,
//   })
// );

// using bult-in functions
const { range, len } = boa.builtins();
const list = range(0, 10); // create a range array
console.log(len(list)); // 10
console.log(list[2]); // 2
