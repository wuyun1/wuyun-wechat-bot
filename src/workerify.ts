/* eslint-disable prettier/prettier */
import { isMainThread, parentPort } from 'worker_threads';
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
// import { createRequire } from 'module';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
// const cjsRequire = createRequire(import.meta.url);

let workerMap: any = null;

const getWorker = (_workFile: string) => {
  const workFile = _workFile;

  let execArgv: string[] = [];
  // let argv: string[] = [];

  if (_workFile.endsWith('.ts')) {
    // workFile = require.resolve('ts-node/dist/bin.js');
    execArgv = [
      // '--esm', '--preferTsExts', '--experimentalSpecifierResolution', 'node',
      // _workFile,

      '-r',
      `ts-node/register`,
      '--loader',
      'ts-node/esm',
      '--no-warnings',
      '--experimental-specifier-resolution',
      'node',
    ];
    // argv = [
    //     '--esm', '--preferTsExts', '--experimentalSpecifierResolution', 'node',
    // ];
  }

  const w = new Worker(workFile, {
    // execArgv,
    // argv,
    execArgv,
    // stdin: true,
    // stdout: true,
    // stderr: true,

    eval: false,

    stdin: false,
    stdout: false,
    stderr: false,
    env: process.env,
  });

  return w;
};

export const createWorkFn = ({
  workFile,
  functionName,
  returnType = 'promise',
}) => {
  if (!workerMap) {
    workerMap = {};
  }

  // let worker = workerMap[workFile];

  // if (!worker) {
  //     worker = getWorker(__filename);
  //     workerMap[workFile] = worker;
  // }

  // worker.once('exit', () => {
  //     delete workerMap[workFile];
  // });

  return (...args): any => {
    const _uuid = Date.now().toString(16) + Math.random().toString(16);

    let worker: Worker = workerMap[workFile];

    if (!worker) {
      worker = getWorker(__filename);
      workerMap[workFile] = worker;
      worker.once('exit', () => {
        delete workerMap[workFile];
      });
    }

    let returnObj: any = null;

    if (returnType === 'stream') {
      const stream = new Readable({
        read() {
          //  no thing
        },
      });

      // 监听来自工作线程的消息
      worker.on('message', (response) => {
        const [type, uuid, data] = response;
        if (uuid !== uuid) {
          return;
        }
        if (type === 'data') {
          stream.push(data);
          return;
        }
        if (type === 'end') {
          stream.push(null);
          return;
        }
        if (type === 'exit') {
          worker.terminate();
          return;
        }
      });

      // 监听来自工作线程的错误
      worker.once('error', (error) => {
        console.log();
        console.error(error);
        console.log();

        stream.push(null);
        stream.emit('error', error);
      });

      returnObj = stream;
    } else {
      let _reject, _resolve;

      const p = new Promise((resolve, reject) => {
        _reject = reject;
        _resolve = resolve;
      });

      // 监听来自工作线程的消息
      worker.on('message', (response) => {
        const [type, uuid, data] = response;
        if (uuid !== uuid) {
          return;
        }
        if (type === 'return') {
          _resolve(data);
        }
        if (type === 'error') {
          _reject(data);
        }
      });

      returnObj = p;
    }

    // 发送消息到工作线程
    worker.postMessage({
      type: 'call',
      workFile,
      returnType,
      functionName,
      uuid: _uuid,
      args,
    });

    return returnObj;
  };
};

if (!isMainThread && parentPort) {
  const streamMap = {};

  let tid;

  const lis = async (message) => {
    const { type, workFile, functionName, uuid, args, returnType } = message;

    if (type === 'call') {
      // const fileObj = cjsRequire(workFile);
      const fileObj = await import(workFile);

      let res: any = null;
      let err: any = null;

      try {
        res = fileObj[functionName](...args);
        if (returnType === 'primise') {
          res = await res;
        }
      } catch (_err) {
        err = _err;
      }

      if (returnType === 'stream') {
        const stream = res;

        streamMap[uuid] = stream;

        const ondata = (chunk) => {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          parentPort.postMessage(['data', uuid, chunk]);
        };

        const onend = () => {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          parentPort.postMessage(['end', uuid]);
          stream.off('data', ondata);
          stream.off('end', onend);
          delete streamMap[uuid];

          // // TODO: 这里后面还是要开启， 节约内存
          // if (tid) {
          //   clearTimeout(tid);
          // }

          // tid = setTimeout(() => {
          //   tid = null;
          //   if (Object.keys(streamMap).length === 0) {
          //     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //     // @ts-ignore
          //     parentPort.off('message', lis);
          //     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //     // @ts-ignore
          //     parentPort.postMessage(['exit', uuid]);
          //   }
          // }, 10000);
        };
        stream.on('data', ondata);
        stream.on('end', onend);
        if (err) {
          stream.emit('error', err);
        }
      } else {
        if (err) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          parentPort.postMessage(['err', uuid, err]);
        } else {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          parentPort.postMessage(['return', uuid, res]);
        }
      }
    }
  };

  parentPort.on('message', lis);
}
