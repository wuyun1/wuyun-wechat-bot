import { loginChatGpt } from './chatgpt';

const api = await loginChatGpt({ force: true });

// await api.initSession();

const result = await api.sendMessage('Hello World!');
console.log(result.response);
