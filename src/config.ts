import dotenv from 'dotenv';

dotenv.config();

if (
  !(
    (process.env.OPENAI_EMAIL && process.env.OPENAI_PASSWORD) ||
    process.env.OPENAI_API_KEY
  )
) {
  throw new Error(
    `请设置环境变量 （ OPENAI_EMAIL 和 OPENAI_PASSWORD ） 或者设置 （ OPENAI_API_KEY ）`
  );
  process.exit(1);
}

export default {
  email: process.env.OPENAI_EMAIL,
  password: process.env.OPENAI_PASSWORD,
  openApiKey: process.env.OPENAI_API_KEY,
  // // 填入你的session token
  // chatGPTSessionToken: '',
  // clearanceToken: '',
  // userAgent: '',
  // 设置获取消息的重试次数
  retryTimes: 1,
  // 在群组中设置唤醒微信机器人的关键词
  groupKey: '',
  // 在私聊中设置唤醒微信机器人的关键词
  privateKey: '',
  // 重置上下文的关键词，如可设置为reset
  resetKey: 'reset',
  // 开启会后收到ChatGPT的自动回复
  autoReply: true,
  // 根据正则匹配是否自动通过好友验证
  friendShipRule: /chatgpt|chat/,
  // 是否在群聊中按照回复的格式进行回复
  groupReplyMode: true,
  // 是否在私聊中按照回复的格式进行回复
  privateReplyMode: false,
  adminWxAliasName: 'admin',
  // adminWxId: 'awyqwx',
};
