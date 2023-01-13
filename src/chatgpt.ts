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
import pTimeout from 'p-timeout';
import { join } from 'path';
import config from './config';
import { retryRequest } from './utils';

const conversationMap = new Map();

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
        return;
      }
      try {
        const res = await chatGPT.sendMessage(content, {
          conversationId: covId,
        });
        if (!covId && res.conversationId) {
          covId = res.conversationId;
          conversationMap.set(covId, conversation);
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

async function getChatGPTReply(content, contactId) {
  const currentConversation = getConversation(contactId);
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

export const loginChatGpt = async (force = false) => {
  if (!chatGPT) {
    let cacheData: OpenAIAuth | null = await getCache();
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
  }

  return chatGPT;
};

export async function replyMessage(contact, content, contactId) {
  if (!chatGPT) {
    console.log('chatGPT 没有登录');
    return;
  }
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
    console.error(e);
    if (e.message.includes('timed out')) {
      await contact.say(
        // eslint-disable-next-line prettier/prettier
        content +
          '\n-----------\nERROR: Please try again, ChatGPT timed out for waiting response.'
      );
    }
    conversationMap.delete(contactId);
  }
}
