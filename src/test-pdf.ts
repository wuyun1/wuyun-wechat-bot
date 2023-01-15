import { pdfToWord } from './utils';

const res = await pdfToWord(
  '/tmp/pdf-to-word-qr6H0PKy90hGaaa.pdf',
  '/tmp/3892244333471481156.docx'
);

console.log(res);
console.log(res.stdout.toString());
console.log(res.stderr.toString());
