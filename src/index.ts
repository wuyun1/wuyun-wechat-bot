// import { types } from 'wechaty-puppet';
import { WechatyBuilder, types } from 'wechaty';
import qrcodeTerminal from 'qrcode-terminal';
import config from './config';
// import config2 from './aaa.json';
import { MessageInterface } from 'wechaty/impls';
// import { loginChatGpt, replyMessage } from './chatgpt';
import { FileBox } from 'file-box';
import { unlinkSync } from 'fs';
import { pdfToWord } from './utils';

// console.log(config2);

// const config = {
//   // 填入你的session token
//   // chatGPTSessionToken: '',
//   // clearanceToken: '',
//   // userAgent: '',
//   // 设置获取消息的重试次数
//   retryTimes: 3,
//   // 在群组中设置唤醒微信机器人的关键词
//   groupKey: '',
//   // 在私聊中设置唤醒微信机器人的关键词
//   privateKey: '',
//   // 重置上下文的关键词，如可设置为reset
//   resetKey: 'reset',
//   // 开启会后收到ChatGPT的自动回复
//   autoReply: true,
//   // 根据正则匹配是否自动通过好友验证
//   friendShipRule: /chatgpt|chat/,
//   // 是否在群聊中按照回复的格式进行回复
//   groupReplyMode: true,
//   // 是否在私聊中按照回复的格式进行回复
//   privateReplyMode: false,
// };

// const replyMessage = (...args) => {
//   console.log(args);
// };

async function onMessage(msg: MessageInterface) {
  // console.log(msg);
  // return;

  // const contact = msg.talker();
  // const contactId = contact.id;
  // const receiver = msg.to();
  // const content = msg.text().trim();
  // const room = msg.room();
  // const alias = (await contact.alias()) || (await contact.name());
  // const isText = msg.type() === bot.Message.Type.Text;

  if (msg.self()) {
    return;
  }
  if (msg.type() === types.Message.Attachment) {
    // console.log(`接到文件信息:`);

    // console.log(`msg isReady: ${msg.isReady()}`);

    const fileBox = await msg.toFileBox();

    const pdfFileName = fileBox.name;

    if (!pdfFileName.endsWith('.pdf')) {
      await msg.say(`pdf 转 word: 请发送 pdf 文件给我`);
      return;
    }

    // const wordFileBox1 = FileBox.fromFile(
    //   '/tmp/2185825531107396333.docx',
    //   `aasdfsd.docx`
    // );

    // await msg.say(wordFileBox1);

    // return;

    // fileBox.
    // if (!msg.isReady()) {

    const f: any = fileBox;

    if (f.headers) {
      f.headers.Range = 'bytes=0-9999';
    }

    const id = msg.id;

    const pdfFilePath = `/tmp/${id}`;
    const wordFilePath = `/tmp/${id}.docx`;

    // console.log('file size:', fileBox.size);

    await fileBox.toFile(pdfFilePath, true);

    await msg.say(`正在转换 ${pdfFileName} 到 ${pdfFileName}.docx ...`);

    await pdfToWord(pdfFilePath, wordFilePath);

    const sendName = pdfFileName.length > 10 ? id : pdfFileName;

    const wordFileBox = FileBox.fromFile(wordFilePath, `${sendName}.docx`);

    await msg.say(wordFileBox);

    unlinkSync(pdfFilePath);
    unlinkSync(wordFilePath);

    // if (f.headers) {
    // console.log(
    //   `curl '${f.remoteUrl}' \\\n  ${Object.keys(f.headers)
    //     .map((key) => `  --header "${key}: ${f.headers[key]}"`)
    //     .join('  \\\n')}`
    // );
    // }

    // console.log(msg);

    // }
    return;
  }
  // console.log(msg.id);
  return;

  // const contact = msg.talker();
  // const contactId = contact.id;
  // const receiver = msg.to();
  // const content = msg.text().trim();
  // const room = msg.room();
  // const alias = (await contact.alias()) || (await contact.name());
  // const isText = msg.type() === bot.Message.Type.Text;
  // if (msg.self()) {
  //   return;
  // }

  // if (room && isText) {
  //   const topic = await room.topic();
  //   console.log(
  //     `Group name: ${topic} talker: ${await contact.name()} content: ${content}`
  //   );

  //   const pattern = RegExp(`^@${receiver.name()}\\s+${config.groupKey}[\\s]*`);
  //   if (await msg.mentionSelf()) {
  //     if (pattern.test(content)) {
  //       const groupContent = content.replace(pattern, '');
  //       replyMessage(room, groupContent, contactId);
  //       return;
  //     } else {
  //       console.log(
  //         'Content is not within the scope of the customizition format'
  //       );
  //     }
  //   }
  // } else if (msg.type() === types.Message.Attachment) {
  //   console.log(`接到文件信息:`);
  //   console.log(msg);
  // } else if (isText) {
  //   console.log(`talker: ${alias} content: ${content}`);
  //   if (config.autoReply) {
  //     if (content.startsWith(config.privateKey)) {
  //       replyMessage(
  //         contact,
  //         content.substring(config.privateKey.length).trim(),
  //         contactId
  //       );
  //     } else {
  //       console.log(
  //         'Content is not within the scope of the customizition format'
  //       );
  //     }
  //   }
  // }
}

function onScan(qrcode) {
  qrcodeTerminal.generate(qrcode); // 在console端显示二维码
  const qrcodeImageUrl = [
    'https://api.qrserver.com/v1/create-qr-code/?data=',
    encodeURIComponent(qrcode),
  ].join('');

  console.log(qrcodeImageUrl);
}

async function onLogin(user) {
  console.log(`${user} has logged in`);
  const date = new Date();
  console.log(`Current time:${date}`);
  if (config.autoReply) {
    console.log(`Automatic robot chat mode has been activated`);
  }
}

function onLogout(user) {
  console.log(`${user} has logged out`);
}

async function onFriendShip(friendship) {
  if (friendship.type() === 2) {
    if (config.friendShipRule.test(friendship.hello())) {
      await friendship.accept();
    }
  }
}

(() => {
  // loginChatGpt();

  // return;
  const bot = WechatyBuilder.build({
    name: 'WechatEveryDay',
    puppet: 'wechaty-puppet-wechat', // 如果有token，记得更换对应的puppet
    puppetOptions: {
      uos: true,
      // endpoint:
      //   '/Users/wuyun/.cache/puppeteer/chrome/mac-1069273/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
    },
  });

  bot
    .on('scan', onScan)
    .on('login', onLogin)
    .on('logout', onLogout)
    .on('message', onMessage);
  if (config.friendShipRule) {
    bot.on('friendship', onFriendShip);
  }

  bot
    .start()
    .then(() => console.log('Start to log in wechat...'))
    .catch((e) => console.error(e));
})();
