import {
  ChatGPTAPI,
  getOpenAIAuth,
  OpenAIAuth,
  // ChatGPTAPIBrowser,
} from 'chatgpt';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmdirSync,
  writeFileSync,
} from 'fs';
import { Configuration, OpenAIApi } from 'openai';
import pTimeout from 'p-timeout';
import { join } from 'path';
import config from './config';
import { retryRequest } from './utils';

const conversationMap = new Map();

let openAi: OpenAIApi | undefined = undefined;
let chatGPT: ChatGPTAPI | undefined;

function resetConversation(contactId: string) {
  if (conversationMap.has(contactId)) {
    conversationMap.delete(contactId);
  }
}

const cacheDir = join(process.cwd(), '_data_chatgpt');

if (!existsSync(cacheDir)) {
  mkdirSync(cacheDir, { recursive: true });
}

const cacheTokenFilePath = join(cacheDir, '_juejinToken.json');

const setCache = async (data: any) => {
  if (data === null) {
    if (existsSync(cacheTokenFilePath)) {
      // unlinkSync(cacheTokenFilePath);
      rmdirSync(cacheTokenFilePath, {
        recursive: true,
      });
    }
    return;
  }

  writeFileSync(
    cacheTokenFilePath,
    JSON.stringify({
      _t: Date.now(),
      ...data,
    })
  );
};

const getCache = async (): Promise<OpenAIAuth | null> => {
  if (existsSync(cacheTokenFilePath)) {
    try {
      return JSON.parse(readFileSync(cacheTokenFilePath).toString());
    } catch (e) {
      console.error(e);
    }
  }
  return null;
};

function getConversation(contactId: string) {
  if (conversationMap.has(contactId)) {
    return conversationMap.get(contactId);
  }

  let covId: undefined | string = undefined;
  const conversation = {
    sendMessage: async (content: string) => {
      if (!chatGPT) {
        throw new Error('chatGPT not login');
      }
      try {
        const res = await chatGPT.sendMessage(content, {
          conversationId: covId,
        });
        if (!covId && res.conversationId) {
          covId = res.conversationId;
          conversationMap.set(contactId, conversation);
        }
        return res;
      } catch (e) {
        if (!(await chatGPT.getIsAuthenticated())) {
          setCache(null);
          throw new Error('chatGPT token 无效');
          // chatGPT = undefined;
          // return;
        }
      }
    },
  };
  return conversation;
}

export const loginOpenAi = (openAIKey?: string | null) => {
  if (openAIKey === null) {
    config.openApiKey = '';
    openAi = undefined;
    return;
  }

  if (!openAIKey && openAi) {
    return openAi;
  }

  const _openApiKey = openAIKey || config.openApiKey;

  if (!_openApiKey) {
    return;
  }

  const configuration = new Configuration({
    apiKey: openAIKey || config.openApiKey,
  });
  config.openApiKey = _openApiKey;
  openAi = new OpenAIApi(configuration);
  return openAi;
};

type Sequence = {
  type: 'Q' | 'A';
  content: string;
};

function getConversationFromOpenAi(contactId: string) {
  if (conversationMap.has(contactId)) {
    return conversationMap.get(contactId);
  }

  let covId: undefined | string = undefined;

  let sequences: Sequence[] = [];

  let timeoutId: any = null;

  const getPrompt = (_sequences: any[]) => {
    const map = {
      Q: '人',
      A: 'AI',
    };
    return _sequences
      .map((item) => {
        // let endC = '';
        // if (item.type === 'Q') {
        //   if (!(item.content.endsWith('?') || item.content.endsWith('？'))) {
        //     endC = '?';
        //   }
        // }
        // return `${map[item.type] || item.type}: ${item.content}${endC}`;
        return `${map[item.type] || item.type}: ${item.content}`;
      })
      .join('\n\n');
  };

  const conversation = {
    sendMessage: async (content: string) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      timeoutId = setTimeout(() => {
        sequences = [];
      }, 5 * 60 * 1000);

      try {
        const _openAi = loginOpenAi();
        if (!_openAi) {
          sequences = [];
          return '没有设置 openAiKey!';
        }

        sequences.push({
          type: 'Q',
          content,
        });

        let prompt = getPrompt(sequences);

        while (prompt.length > 2000) {
          sequences = sequences.slice(2);
          prompt = getPrompt(sequences);
        }
        const resPrompt = `请用 markdown 格式补充下面对话: \n${prompt}\n\nAI:`;
        const args = {
          model: 'text-davinci-003',
          prompt: resPrompt,
          temperature: 0.5,
          max_tokens: 1000,
          top_p: 1,
          // user: covId,
          frequency_penalty: 0.0,
          presence_penalty: 0.0,
          // stop: ['\n'],
        };

        console.log({ resPrompt });
        const response2 = await _openAi.createCompletion({
          ...args,
          // stop: ['\n'],
        });
        const aContent = response2.data.choices
          .map((item) => item.text)
          .join('\n')
          .trim()
          .replace(/^\s*[aA]:\s*/, '');

        sequences.push({
          type: 'A',
          content: aContent,
        });
        if (!covId && response2.data.id) {
          covId = response2.data.id;
          conversationMap.set(contactId, conversation);
        }
        return aContent;
      } catch (e: any) {
        // console.log(e.message || e);
        conversationMap.delete(contactId);
        if (e.response) {
          const msg = `Error: ${e.response.status}\n${JSON.stringify(
            e.response.data,
            null,
            2
          )}`;
          return msg;
        }
        throw e;
      }
    },
  };
  conversationMap.set(contactId, conversation);
  return conversation;
}

async function getChatGPTReply(content, contactId) {
  const getConversationFn = config.openApiKey
    ? getConversationFromOpenAi
    : getConversation;

  const currentConversation = getConversationFn(contactId);
  // send a message and wait for the response
  const threeMinutesMs = 3 * 60 * 1000;
  const response = await pTimeout(currentConversation.sendMessage(content), {
    milliseconds: threeMinutesMs,
    message: 'ChatGPT timed out waiting for response',
  });
  console.log('response: ', response);
  // response is a markdown-formatted string
  return response;
}

let isLogining = false;

export const loginChatGpt = async ({
  force = false,
  reloadCache = false,
}: {
  force?: boolean;
  reloadCache?: boolean;
} = {}) => {
  if (isLogining) {
    throw new Error('当前正在登录');
  }
  try {
    isLogining = true;
    if (!chatGPT) {
      let cacheData: OpenAIAuth | null = await getCache();
      if (reloadCache && !cacheData) {
        throw new Error('当前目录下不存在 chatGPT token');
      }
      if (force || !cacheData) {
        cacheData = await getOpenAIAuth({
          email: config.email,
          password: config.password,
          // proxyServer: 'http://127.0.0.1:1081',
          // proxyServer: 'socks5://127.0.0.1:1080',
          // proxyServer: 'socks5://127.0.0.1:1080',
          // proxyServer: 'socks5://127.0.0.1:7890',
          // https_proxy=http://127.0.0.1:7890 http_proxy=http://127.0.0.1:7890 all_proxy=socks5://127.0.0.1:7890
        });
      }

      chatGPT = new ChatGPTAPI({
        ...cacheData,
        // proxyServer: 'socks5://127.0.0.1:7890',
        // sessionToken: config.chatGPTSessionToken,
        // clearanceToken: config.clearanceToken,
        // userAgent: config.userAgent,
      });

      if (!(await chatGPT.getIsAuthenticated())) {
        setCache(null);
        throw new Error('chatGPT token 无效');
        // chatGPT = undefined;
        // return;
      }

      setCache(cacheData);
    } else if (reloadCache) {
      const cacheData: OpenAIAuth | null = await getCache();
      if (!cacheData) {
        throw new Error('当前目录下不存在 chatGPT token');
      }
      chatGPT = new ChatGPTAPI({
        ...cacheData,
        // proxyServer: 'socks5://127.0.0.1:7890',
        // sessionToken: config.chatGPTSessionToken,
        // clearanceToken: config.clearanceToken,
        // userAgent: config.userAgent,
      });
    }
    return chatGPT;
  } catch (e) {
    chatGPT = undefined;
    console.log(e);
    throw e;
  } finally {
    isLogining = false;
  }
};

export async function replyMessage(contact, content, contactId) {
  try {
    if (
      content.trim().toLocaleLowerCase() === config.resetKey.toLocaleLowerCase()
    ) {
      resetConversation(contactId);
      await contact.say('Previous conversation has been reset.');
      return;
    }
    const message = await retryRequest(
      () => getChatGPTReply(content, contactId),
      config.retryTimes,
      500
    );

    if (
      (contact.topic && contact?.topic() && config.groupReplyMode) ||
      (!contact.topic && config.privateReplyMode)
    ) {
      const result = content + '\n-----------\n' + message;
      await contact.say(result);
      return;
    } else {
      await contact.say(message);
    }
  } catch (e: any) {
    console.error(e.message || e);
    if (e.message.includes('timed out')) {
      await contact.say(
        // eslint-disable-next-line prettier/prettier
        `${content}\n-----------\nERROR: Please try again, ChatGPT timed out for waiting response.`
      );
    } else {
      await contact.say(e.message);
    }
    conversationMap.delete(contactId);
  }
}
