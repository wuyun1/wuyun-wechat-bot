import fastifyFactory, { FastifySchema } from 'fastify';
import fs from 'fs';
import { answer_sync } from './py-utils';
import { pdf_to_word } from './py-utils';
import { fileURLToPath } from 'url';
// import fastifyMultipart from '@fastify/multipart';
// import fastifySee from 'fastify-sse';
import fastifySwagger from '@fastify/swagger';
// import { Fas } from '@fastify/swagger-ui';
import { createReadStream } from 'fs';
// import { PassThrough } from 'stream';
// import { createWriteStream } from 'fs';
// import { pipeline } from 'stream';
// import { createInterface } from 'readline';
import path, { dirname, join } from 'path';
// import { randomBytes } from 'crypto';
import { createRequire } from 'module';
// import dotenv from 'dotenv';

// dotenv.config();

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  const { FastifyFormidable, ajvBinaryFormat } = require('fastify-formidable');

  const app = fastifyFactory({
    logger: true,
    ajv: {
      plugins: [ajvBinaryFormat],
    },
  });

  try {
    // await app.register(fastifyMultipart, { attachFieldsToBody: true });

    await app.register(FastifyFormidable, {
      addContentTypeParser: true,
    });

    // await app.register(fastifySee);

    await app.register(fastifySwagger, {
      openapi: {
        info: {
          title: 'WX API',
          description: 'API for WX',
          version: '3.0.0',
        },
        // consumes: ['multipart/form-data', 'application/json'],
        // produces: ['multipart/form-data', 'application/json'],
        tags: [{ name: 'file', description: 'File operations' }],
        // definitions: {
        //   File: {
        //     type: 'object',
        //     properties: {
        //       file: { type: 'string', format: 'binary' },
        //     },
        //   },
        // },
      },
    });

    const swaggerUi = require('@fastify/swagger-ui');

    await app.register(swaggerUi, {
      routePrefix: '/docs',
      // uiConfig: {
      //   docExpansion: 'full',
      //   deepLinking: false,
      // },
      // uiHooks: {
      //   onRequest: function (request, reply, next) {
      //     next();
      //   },
      //   preHandler: function (request, reply, next) {
      //     next();
      //   },
      // },
      // staticCSP: true,
      // transformStaticCSP: (header) => header,
      // transformSpecification: (swaggerObject, request, reply) => {
      //   return swaggerObject;
      // },
      // transformSpecificationClone: true,
    });

    const random_string = () => {
      return Math.random().toString(16).substring(2, 16);
    };

    app.post(
      '/pdf-to-word',
      {
        schema: {
          tags: ['file'],
          body: {
            type: 'object',
            required: ['file'],
            properties: {
              file: { type: 'string', format: 'binary' },
              // aa: { type: 'string' },
            },
          },
          consumes: ['multipart/form-data'],
          // produces: ['application/json'],
        } as FastifySchema,
      },
      async (request, reply) => {
        try {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const { file } = request.body;

          // const pdf_file = file;
          // const pdf_file_name = pdf_file.filename || `pdf-file-${random_string()}.pdf`;

          // // if (!pdf_file_name.endsWith('.pdf')) {
          // //   return '请上传 pdf 文件';
          // // }

          // app.log.info(`upload filename: ${pdf_file_name} !`);

          // const temp_dir = '/tmp';

          // const file_name = path.basename(pdf_file_name);

          // const random_s = 'pdf-to-word-' + random_string();

          // const pdf_file_path = `${temp_dir}/${random_s}${pdf_file_name}`;
          // const word_file_name = `${file_name}.docx`;
          // const word_file_path = `${temp_dir}/${random_s}${word_file_name}`;

          // const content = pdf_file.file;
          // fs.writeFileSync(pdf_file_path, content);

          const pdf_file_path = file;
          const random_s = 'pdf-to-word-' + random_string();
          const file_name = path.basename(pdf_file_path);
          const word_file_name = `${file_name}.docx`;
          const temp_dir = '/tmp';
          const word_file_path = `${temp_dir}/${random_s}${word_file_name}`;

          pdf_to_word(pdf_file_path, word_file_path);

          const stream = fs.createReadStream(word_file_path);
          reply.type(
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          );
          reply.header(
            'Content-Disposition',
            `attachment; filename="${word_file_name}"`
          );
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          // stream.pipe(reply.res);
          stream?.on('end', () => {
            fs.unlinkSync(pdf_file_path);
            fs.unlinkSync(word_file_path);
          });
          return reply.send(stream);
        } catch (err) {
          app.log.error(err);
          reply.code(500).send();
        }
      }
    );

    const chatbot_html_file_path = join(__dirname, 'chatbot.html');

    app.get('/', async (request, reply) => {
      // reply.send({ hello: 'world' });
      // console.log(`file: ${chatbot_html_file_path}`);
      const fileStream = createReadStream(chatbot_html_file_path, 'utf8');
      reply.type('text/html');
      return reply.send(fileStream);
    });

    const generate_text_async = function generate_text_async(
      q
      // request
    ) {
      const generation_params = {
        text: q.text,
        max_new_tokens: q.max_len,
        sample: q.sample,
        top_k: q.top_k,
        top_p: q.top_p,
        // request,
        temperature: q.temperature,
      };
      // yield JSON.stringify(generation_params);

      return answer_sync(generation_params);
    };

    app.post(
      '/api/generate_text_async',
      {
        schema: {
          // tags: ['file'],
          body: {
            type: 'object',
            required: ['text'],
            properties: {
              text: { type: 'string', default: '你好' },
              max_len: { type: 'number', default: 40 },
              sample: { type: 'boolean' },
            },
          },
          consumes: ['application/json'],
          produces: ['text/event-stream'],
        } as FastifySchema,
      },
      async (request, reply) => {
        reply.raw.setHeader('content-type', 'text/event-stream');

        const text_request = request.body;
        const stream = generate_text_async(new Question(text_request as any));

        const breakFn = () => {
          stream.destroy();
          console.log('===========breakFn======');
        };

        request.socket.on('error', breakFn);

        stream.on('data', (chunk) => {
          // console.log({ chunk });
          reply.raw.write(chunk);
        });

        stream.on('end', () => {
          reply.raw.end();
        });

        return reply;

        // const stream = new Readable({
        //   objectMode: true,
        //   read() {
        //     // no thing
        //   },
        // });

        // const delay = (t = 0) => {
        //   return new Promise((re) => {
        //     setTimeout(() => {
        //       re(null);
        //     }, t);
        //   });
        // };

        // (async () => {
        //   let i = 0;
        //   while (i < 10) {
        //     stream.push(`\ndata: ${i}\n`);

        //     await delay(1000);

        //     i++;
        //   }
        //   stream.push('\nend\n');
        //   stream.push(null);
        // })();

        // return reply.send(stream);
      }
    );

    app.post(
      '/api/generate_text',
      {
        schema: {
          // tags: ['file'],
          body: {
            type: 'object',
            required: ['text'],
            properties: {
              text: { type: 'string', default: '你好' },
              max_len: { type: 'number', default: 40 },
              sample: { type: 'boolean' },
            },
          },
          consumes: ['application/json'],
          produces: ['application/json'],
        } as FastifySchema,
      },
      async (request, reply) => {
        const text_request = request.body;
        return reply.send(text_request);
      }
    );

    const res = await app.listen({
      port: 3000,
      host: '0.0.0.0',
    });
    console.log(`Server listening at ${res}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
