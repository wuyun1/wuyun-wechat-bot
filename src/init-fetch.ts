import nodeFetch from 'node-fetch';

if (typeof globalThis.fetch !== 'function') {
  globalThis.fetch = nodeFetch;
}

const fetch = globalThis.fetch;

export { fetch };
