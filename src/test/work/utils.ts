// const { Readable } = require('stream');
import { Readable } from 'stream';

const delay = (t = 0) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, t);
  });

function createReadableStream(json) {
  const stream = new Readable({
    read() {
      // no thing ...
    },
  });

  (async () => {
    for (let index = 0; index < 5; index++) {
      stream.push(JSON.stringify({ json, count: index }));
      await delay(1000);
    }
    stream.push(null);
  })();

  return stream;
}

// module.exports = {
//   createReadableStream,
// };

export { createReadableStream };
