# FROM ubuntu AS novnc-node-18
FROM node:18-slim AS novnc-node-18
# FROM ubuntu

ARG ALIYUN=""

ADD ./sources.list /tmp/sources.list.1

RUN if [ "x$ALIYUN" != "xnone" ] ; then mv -f /tmp/sources.list.1 /etc/apt/sources.list ; else rm -rf /tmp/sources.list.1 ; fi

# RUN apt update -y && apt install --reinstall ca-certificates -y

# 各种环境变量
ENV LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8 \
    S6_BEHAVIOUR_IF_STAGE2_FAILS=2 \
    S6_CMD_ARG0=/sbin/entrypoint.sh \
    VNC_GEOMETRY=800x600 \
    VNC_PASSWD=MAX8char \
    USER_PASSWD=abc1234 \
    DEBIAN_FRONTEND=noninteractive \
    GIT_SSL_NO_VERIFY=1 \
    S6_OVERLAY_VERSION=3.1.2.1 \
    TIGERVNC_VERSION=1.12.90

# 首先加用户，防止 uid/gid 不稳定
RUN set -ex && \
    groupadd user && useradd -m -g user user && \
    # 安装依赖和代码
    apt-get update && apt-get upgrade -y && \
    apt-get install -y \
        git \
        curl \
        ca-certificates wget locales \
        nginx sudo \
        xz-utils \
        # python-numpy \
        xorg openbox rxvt-unicode
    # apt-get purge -y git wget && \
    # apt-get autoremove -y && \
    # apt-get clean && \
    # rm -fr /tmp/* /app/src/novnc/.git /app/src/websockify/.git /var/lib/apt/lists

RUN if [ "x$ALIYUN" != "xnone" ] ; then \
      (git config --global url."https://github.91chi.fun/https://github.com".insteadOf https://github.com && export HTTP_GIT_PREFIX="https://github.91chi.fun/") ; \
    else \
      export HTTP_GIT_PREFIX="" ; \
    fi && \
    # s6-overlay
    wget -O /tmp/s6-overlay-noarch.tar.xz ${HTTP_GIT_PREFIX}https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz && \
    tar -C / -xpvJf /tmp/s6-overlay-noarch.tar.xz && rm -rf /tmp/s6-overlay-noarch.tar.xz && \
    wget -O /tmp/s6-overlay-x86_64.tar.xz ${HTTP_GIT_PREFIX}https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-x86_64.tar.xz && \
    tar -C / -xpvJf /tmp/s6-overlay-x86_64.tar.xz && rm -rf /tmp/s6-overlay-x86_64.tar.xz && \
    # workaround for https://github.com/just-containers/s6-overlay/issues/158
    ln -s /init /init.entrypoint && \
    # tigervnc
    wget -O /tmp/tigervnc.tar.gz https://nchc.dl.sourceforge.net/project/tigervnc/beta/1.13beta/tigervnc-${TIGERVNC_VERSION}.x86_64.tar.gz && \
    tar xzf /tmp/tigervnc.tar.gz -C /tmp && \
    chown root:root -R /tmp/tigervnc-${TIGERVNC_VERSION}.x86_64 && \
    tar c -C /tmp/tigervnc-${TIGERVNC_VERSION}.x86_64 usr | tar x -C / && \
    locale-gen en_US.UTF-8 && \
    # novnc
    mkdir -p /app/src && \
    git clone --depth=1 https://github.com/novnc/noVNC.git /app/src/novnc && \
    git clone --depth=1 https://github.com/novnc/websockify.git /app/src/websockify


# copy files
COPY ./vnc-docker-root /

EXPOSE 9000/tcp 9001/tcp 5901/tcp

ENTRYPOINT ["/init.entrypoint"]
# ENTRYPOINT ["/sbin/entrypoint.sh"]
CMD ["start"]

# ENV NODE_VERSION v19.4.0

# ENV NVM_DIR=/root/.nvm
# ENV NVM_SOURCE=https://gitee.com/mirrors/nvm.git
# ENV NVM_NODEJS_ORG_MIRROR=http://npm.taobao.org/mirrors/node

# RUN curl -o- https://gitee.com/mirrors/nvm/raw/master/install.sh | bash

# ENV PATH /root/.nvm/versions/node/$NODE_VERSION/bin:$PATH

# RUN node -v


# RUN ln -s /usr/local/bin/node /usr/local/bin/nodejs \
#     # smoke tests
#     && node --version \
#     && npm --version

FROM novnc-node-18 AS laststage

ARG ALIYUN=""

RUN groupadd -r python-user && useradd -r -m -g python-user python-user

# USER python-user

ENV PYTHON_VERSION 3.10.0

# Set-up necessary Env vars for PyEnv
ENV PYENV_ROOT /home/python-user/.pyenv
ENV PATH $PYENV_ROOT/shims:$PYENV_ROOT/bin:$PATH

# RUN echo $PATH && whoami && dfasd
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y -f \
      wget unzip curl git python3 python3-pip python3-tk

# # Install pyenv
# RUN set -ex \
#     # && git config --global url."https://github.91chi.fun/https://github.com".insteadOf https://github.com \
#     && curl https://pyenv.run | bash \
#     && pyenv update \
#     && pyenv install $PYTHON_VERSION \
#     && pyenv global $PYTHON_VERSION \
#     && pyenv rehash

# RUN python3 -m pip install --upgrade pip

# COPY --chown=user:user ./requirements.txt /home/python-user/app/requirements.txt
COPY ./requirements.txt /home/python-user/app/requirements.txt

RUN if [ "x$ALIYUN" != "xnone" ] ; then \
      pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple; \
    fi && \
    pip install --no-cache-dir --upgrade -r /home/python-user/app/requirements.txt

# USER root

EXPOSE 8000

WORKDIR /app


ADD package.json package-lock.json .npmrc /app/

ADD .npmrc /tmp/.npmrc2

RUN if [ "x$ALIYUN" != "xnone" ] ; then mv -f /tmp/.npmrc2 /app/.npmrc; else rm -rf  /tmp/.npmrc2; fi


RUN npm install \
     && npm run puppet-install

# # Suppress an apt-key warning about standard out not being a terminal. Use in this script is safe.
# ENV APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE=DontWarn
# # Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# # Note: this installs the necessary libs to make the bundled version of Chromium that Puppeteer
# # installs, work.


# COPY --chown=user:user ./app /home/python-user/app
COPY ./app /app/
ADD ./lib/ ./tsconfig.json ./.npmrc /app/
COPY vncmain.sh /app/vncmain.sh
RUN chmod +x /app/vncmain.sh

# RUN npm run build
# CMD ["node", "lib/bundle.esm.js"]

# docker build . -t wechatbot:latest
# docker build . -t wechatbot:latest --build-arg ALIYUN=none
# docker run -ti --name vnc-test --env-file .env -p 3000:3000 -p 8000:8000  --rm oott123/novnc:latest bash
