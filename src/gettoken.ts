// import puppeteer from 'puppeteer';
import {
  existsSync,
  mkdirSync,
  // readFileSync,
  rmdirSync,
  writeFileSync,
} from 'fs';

import { join } from 'path';
import puppeteer from 'puppeteer';

// const cacheDir = join(process.cwd());
const cacheDir = join(process.cwd(), '_data');

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

// const getCache = async (): Promise<any> => {
//   if (existsSync(cacheTokenFilePath)) {
//     try {
//       return JSON.parse(readFileSync(cacheTokenFilePath).toString());
//     } catch (e) {
//       console.error(e);
//     }
//   }
//   return {};
// };

const delay = (t = 0) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, t);
  });
};

const doLogin = async (command: any): Promise<any> => {
  let data: any = {};
  // await this.installChrome();
  console.log('正在跳转到浏览器, 请在浏览器完成登录...');
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox'],
    // args: ['--proxy-server=socks5://127.0.0.1:1080'],
    // args: ['--proxy-server=http://127.0.0.1:1081'],
  });
  const page = (await browser.pages())[0] || (await browser.newPage());
  await page.goto('https://ip138.com/');
  // https://chat.openai.com/auth/login

  // await delay(300000000);
  await page.waitForSelector('.login-buttabcadfasfsdfasdfon', {
    timeout: 300000000,
  });

  return;

  try {
    await page.waitForSelector('.login-button', {
      timeout: 20000,
    });
    await page.click('.login-button');
  } catch (e) {
    console.info(e);
  }

  await page.waitForSelector('.login-button');
  await page.click('.login-button');

  const switchLoginTypeSelector =
    '#juejin > div.global-component-box > div.auth-modal-box > form > div.panel > div.prompt-box > span';
  await page.waitForSelector(switchLoginTypeSelector);
  await page.click(switchLoginTypeSelector);

  await page.waitForSelector('input[name=loginPhoneOrEmail]');
  if (command.user) {
    await page.type('input[name=loginPhoneOrEmail]', command.user.split());
  }
  if (command.pass) {
    await page.type('input[name=loginPassword]', command.pass.split());
  }
  if (command.user && command.pass) {
    await page.click(
      '#juejin > div.global-component-box > div.auth-modal-box > form > div.panel > button'
    );
  }
  try {
    let myResolve: any = null;
    const eventListener = async (event: any) => {
      if (
        event.status() === 200 &&
        event.url().includes('api.juejin.cn/user_api/v1/user')
      ) {
        // event.method ===  'get' &&
        const responseData: any = await event.json();
        myResolve && myResolve(responseData.data);
        page.removeListener('response', eventListener);
      }
    };
    const userInfo: any = await Promise.race([
      new Promise((resolve) => {
        myResolve = resolve;
        page.addListener('response', eventListener);
      }),
    ]);
    // if (!userInfo) {
    //     throw new Error('请求超时');
    // }
    data = {
      user_id: userInfo?.profile_id,
      ...data,
      ...userInfo,
    };

    const sessionInfo: any = {};
    const pageCookies = await page.cookies();

    for (const cookieItem of pageCookies) {
      if (cookieItem.name === 'passport_csrf_token') {
        sessionInfo.token = cookieItem.value;
        continue;
      } else if (cookieItem.name === 'sessionid') {
        sessionInfo.sessionid = cookieItem.value;
        continue;
      }
    }

    if (!sessionInfo) {
      throw new Error('请求超时');
    }
    data = {
      ...data,
      ...sessionInfo,
    };
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
  // data = {
  //     ...(await page.evaluate(():any => {
  //         let token = '';
  //         let sessionid = '';
  //         const tokenReg = /.*passport_csrf_token=([^;]+)(;.*|$)/;
  //         let regResult = tokenReg.exec(document.cookie);
  //         if(regResult) {
  //             token = regResult[1];
  //         }
  //         const sessionidReg = /.*sessionid=([^;]+)(;.*|$)/;
  //         regResult = sessionidReg.exec(document.cookie);
  //         if(regResult) {
  //             sessionid = regResult[1];
  //         }
  //         return {
  //             token,
  //             sessionid,
  //         };
  //     })),
  //     ...data,
  // };
  // await page.screenshot({ path: 'example.png' });
  await browser.close();

  if (!data.user_id) {
    console.log(`登录失败!`);

    return;
  }
  console.log(`登录成功!`);
  console.log(`当前用户用户ID: ${data.user_id}`);

  if (!command.disableCache) {
    await setCache(data);
  }
  return data;
};

(() => {
  const options = {
    disableCache: false,
    pass: 'wu950429',
    user: '842269153@qq.com',
  };

  doLogin(options);
})();
