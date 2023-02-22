import fastifyFactory from 'fastify';
import fs from 'fs';
import { answer_sync } from './py-utils';
import { pdf_to_word } from './py-utils';
import fastifyMultipart from 'fastify-multipart';
import { createReadStream } from 'fs';
// import { PassThrough } from 'stream';
// import { createWriteStream } from 'fs';
// import { pipeline } from 'stream';
// import { createInterface } from 'readline';
import path, { join } from 'path';
// import { randomBytes } from 'crypto';

class Question {
  text: string;
  max_len: number;
  temperature: number;
  top_p: number;
  top_k: number;
  sample: boolean;
  constructor({
    text = '用户: 写首诗\n小元: ',
    // description = null,
    max_len = 50,
    temperature = 1.0,
    top_p = 0.95,
    top_k = 0,
    sample = true,
  } = {}) {
    this.text = text;
    // this.description = description;
    this.max_len = max_len;
    this.temperature = temperature;
    this.top_p = top_p;
    this.top_k = top_k;
    this.sample = sample;
  }
}

// Run the server!
const start = async () => {
  const app = fastifyFactory({ logger: true });

  try {
    app.register(fastifyMultipart);

    const random_string = () => {
      return Math.random().toString(16).substr(2, 8);
    };

    app.post('/pdf-to-word', async (request, reply) => {
      try {
        const { files } = await request.file();
        const pdf_file = files[0];
        const pdf_file_name = pdf_file.filename;

        if (!pdf_file_name.endsWith('.pdf')) {
          return '请上传 pdf 文件';
        }

        app.log.info(`upload filename: ${pdf_file_name} !`);

        const temp_dir = '/tmp';

        const file_name = path.basename(pdf_file_name);

        const random_s = 'pdf-to-word-' + random_string();

        const pdf_file_path = `${temp_dir}/${random_s}${pdf_file_name}`;
        const word_file_name = `${file_name}.docx`;
        const word_file_path = `${temp_dir}/${random_s}${word_file_name}`;

        const content = pdf_file.file.read();
        fs.writeFileSync(pdf_file_path, content);

        pdf_to_word(pdf_file_path, word_file_path);

        const stream = fs.createReadStream(word_file_path);
        reply.type(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
        reply.header(
          'Content-Disposition',
          `attachment; filename="${word_file_name}"`
        );
        stream.pipe(reply.res);
        stream.on('end', () => {
          fs.unlinkSync(pdf_file_path);
          fs.unlinkSync(word_file_path);
        });
      } catch (err) {
        app.log.error(err);
        reply.code(500).send();
      }
    });

    const generate_text_async = async function* generate_text_async(
      q,
      request
    ) {
      const generation_params = {
        text: q.text,
        max_new_tokens: q.max_len,
        sample: q.sample,
        top_k: q.top_k,
        top_p: q.top_p,
        request,
        temperature: q.temperature,
      };
      // yield JSON.stringify(generation_params);

      for await (const token of answer_sync(generation_params)) {
        yield token.toString();
      }
    };

    app.post('/api/generate_text_async', async (request, reply) => {
      const { text_request } = request.body;
      reply.raw.setHeader('content-type', 'text/event-stream');
      reply.raw.write('\n');
      const asyncIterator = generate_text_async(
        new Question(text_request),
        request
      );
      for await (const chunk of asyncIterator) {
        reply.raw.write(`data: ${chunk}\n\n`);
      }
    });

    const chatbot_html_file_path = join(__dirname, 'chatbot.html');

    app.get('/', async (request, reply) => {
      const fileStream = createReadStream(chatbot_html_file_path);
      reply.type('text/html');
      reply.send(fileStream);
    });

    const res = await app.listen({
      port: 300,
      host: '0.0.0.0',
    });
    console.log(`Server listening at ${res}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
