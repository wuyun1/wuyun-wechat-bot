// import { ChatGPTAPIBrowser } from 'chatgpt';

// const api = new ChatGPTAPIBrowser({
//   email: process.env.OPENAI_EMAIL || 'jajabjbj@gmail.com',
//   password: process.env.OPENAI_PASSWORD || 'wU950429.....',
//   // proxyServer: 'http://127.0.0.1:1081',
//   proxyServer: 'socks5://127.0.0.1:1080',
//   // proxyServer: 'socks5://127.0.0.1:7890',
//   // https_proxy=http://127.0.0.1:7890 http_proxy=http://127.0.0.1:7890 all_proxy=socks5://127.0.0.1:7890
// });

// await api.initSession();

// const result = await api.sendMessage('Hello World!');
// console.log(result.response);

import { loginChatGpt } from './chatgpt';

const api = await loginChatGpt({ force: true });

// await api.initSession();

const result = await api.sendMessage('Hello World!');
console.log(result.response);
