// import { types } from 'wechaty-puppet';
import { WechatyBuilder, types } from 'wechaty';
import qrcodeTerminal from 'qrcode-terminal';
import config from './config';
// import config2 from './aaa.json';
import { MessageInterface, WechatyInterface } from 'wechaty/impls';
import { loginChatGpt, replyMessage } from './chatgpt';
import { FileBox } from 'file-box';
import { existsSync, unlinkSync } from 'fs';
import { pdfToWord } from './utils';

let bot: WechatyInterface | null = null;

async function onMessage(msg: MessageInterface) {
  if (!bot) {
    return;
  }
  // console.log(msg);
  // return;

  // const contact = msg.talker();
  // const contactId = contact.id;
  // const receiver = msg.to();
  // const content = msg.text().trim();
  // const room = msg.room();
  // const alias = (await contact.alias()) || (await contact.name());
  // const isText = msg.type() === bot.Message.Type.Text;

  const isText = msg.type() === types.Message.Text;

  if (msg.self() && isText) {
    const content = msg.text().trim();

    if (content === 'reloadCache') {
      try {
        await loginChatGpt({ reloadCache: true });
        await msg.say('重载 token 成功.');
      } catch (e: any) {
        await msg.say(`登录失败. ${e.message || e}`);
      }
    }

    if (content === 'reLogin') {
      try {
        await msg.say('正在登录.');
        await loginChatGpt({ force: true });
        await msg.say('登录成功.');
      } catch (e: any) {
        await msg.say(`登录失败. ${e.message || e}`);
      }
    }

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

    await msg.say(`正在转换 ${pdfFileName} 到 ${pdfFileName}.docx`);

    const logs = await pdfToWord(pdfFilePath, wordFilePath);

    if (!existsSync(wordFilePath)) {
      unlinkSync(pdfFilePath);

      await msg.say(`pdf 转换失败： ${logs.stderr.toString('utf-8')}`);

      return;
    }

    console.log(logs.stdout.toString('utf8'));

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

  const contact = msg.talker();
  const contactId = contact.id;
  const receiver = msg.listener();
  const room = msg.room();
  const alias = (await contact.alias()) || (await contact.name());
  if (isText) {
    const content = msg.text().trim();
    if (room) {
      const topic = await room.topic();
      console.log(
        `Group name: ${topic} talker: ${await contact.name()} content: ${content}`
      );

      const pattern = RegExp(
        `^@${receiver?.name()}\\s+${config.groupKey}[\\s]*`
      );
      if (await msg.mentionSelf()) {
        if (pattern.test(content)) {
          const groupContent = content.replace(pattern, '');
          replyMessage(room, groupContent, contactId);
          return;
        } else {
          console.log(
            'Content is not within the scope of the customizition format'
          );
        }
      }
    } else {
      console.log(`talker: ${alias} content: ${content}`);
      if (config.autoReply) {
        if (content.startsWith(config.privateKey)) {
          replyMessage(
            contact,
            content.substring(config.privateKey.length).trim(),
            contactId
          );
        } else {
          console.log(
            'Content is not within the scope of the customizition format'
          );
        }
      }
    }
  }
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
  bot = WechatyBuilder.build({
    name: 'WechatEveryDay2',
    // puppet: 'wechaty-puppet-wechat4u', // 如果有token，记得更换对应的puppet
    puppet: 'wechaty-puppet-wechat', // 如果有token，记得更换对应的puppet
    puppetOptions: {
      uos: true,
      launchOptions: {
        // executablePath: executablePath(),
        // // headless: false,
        // ... others launchOptions, see: https://github.com/GoogleChrome/puppeteer/blob/v1.18.1/docs/api.md#puppeteerlaunchoptions
      },
      // endpoint: defaultChromeExecutablePath(),
      // endpoint:
      //   '/Users/wuyun/.cache/puppeteer/chrome/mac-1069273/chrome-mac/Chromium.app/Contents/MacOS/Chromium --no-sandbox',
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
