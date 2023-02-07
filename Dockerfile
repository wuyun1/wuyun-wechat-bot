# FROM ubuntu AS novnc-node-18
FROM nvidia/cuda:10.0-runtime-ubuntu18.04 AS novnc-node-18
# FROM ubuntu

RUN rm -rf /etc/apt/sources.list.d/*

ARG ALIYUN=""

ADD ./check-valid-until.txt /etc/apt/apt.conf.d/10no--check-valid-until

ADD ./sources.list /tmp/sources.list.1

RUN if [ "x$ALIYUN" != "xnone" ] ; then mv -f /tmp/sources.list.1 /etc/apt/sources.list ; else rm -rf /tmp/sources.list.1 ; fi

# RUN apt update -y && apt install --reinstall ca-certificates -y

# 各种环境变量
ENV LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    S6_BEHAVIOUR_IF_STAGE2_FAILS=2 \
    S6_CMD_ARG0=/sbin/entrypoint.sh \
    DEBIAN_FRONTEND=noninteractive \
    CHROMIUM_FLAGS="--no-sandbox" \
    VNC_GEOMETRY=800x600 \
    VNC_PASSWD=MAX8char \
    DISPLAY=:11 \
    USER_PASSWD=abc1234 \
    GIT_SSL_NO_VERIFY=1 \
    TIGERVNC_VERSION=1.12.0 \
    LANGUAGE=C.UTF-8

# 首先加用户，防止 uid/gid 不稳定
RUN set -ex && \
    groupadd user && useradd -m -g user user && \
    # 安装依赖和代码
    apt-get update && apt-get upgrade -y && \
    apt-get install -y \
        git \
        curl \
        # tightvncserver \
        ca-certificates wget locales \
        procps \
        nginx sudo \
        tmux \
        libnss3-dev \
        net-tools \
        xz-utils \
        # python-numpy \
        xorg openbox rxvt-unicode
    # apt-get purge -y git wget && \
    # apt-get autoremove -y && apt-get clean && rm -fr /tmp/* /app/src/novnc/.git /app/src/websockify/.git /var/lib/apt/lists

RUN wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -O /tmp/google-chrome-stable_current_amd64.deb && \
  apt-get install -y /tmp/google-chrome-stable_current_amd64.deb

RUN if [ "x$ALIYUN" != "xnone" ] ; then \
      git config --global url."https://ghproxy.com/https://github.com".insteadOf https://github.com ; \
    fi && \
    # tigervnc
    wget -O /tmp/tigervnc.tar.gz https://nchc.dl.sourceforge.net/project/tigervnc/stable/${TIGERVNC_VERSION}/tigervnc-${TIGERVNC_VERSION}.x86_64.tar.gz && \
    tar xzf /tmp/tigervnc.tar.gz -C /tmp && \
    chown root:root -R /tmp/tigervnc-${TIGERVNC_VERSION}.x86_64 && \
    tar c -C /tmp/tigervnc-${TIGERVNC_VERSION}.x86_64 usr | tar x -C / && \
    locale-gen --purge zh_CN.UTF-8 && \
    update-locale "zh_CN.UTF-8" && \
    dpkg-reconfigure --frontend noninteractive locales && \
    # novnc
    mkdir -p /_app/src && \
    git clone --depth=1 https://github.com/novnc/noVNC.git /_app/src/novnc && \
    git clone --depth=1 https://github.com/novnc/websockify.git /_app/src/websockify


# copy files
COPY ./vnc-docker-root /

EXPOSE 9000/tcp 9001/tcp 5911/tcp

ENTRYPOINT ["/sbin/entrypoint.sh"]

CMD ["start"]

# ENV NODE_VERSION v19.6.0
# ENV NODE_VERSION v18.14.0
ENV NODE_VERSION v16.19.0

ENV NVM_DIR=/root/.nvm
ENV NVM_SOURCE=https://gitee.com/mirrors/nvm.git
ENV NVM_NODEJS_ORG_MIRROR=http://npm.taobao.org/mirrors/node

RUN curl -o- https://gitee.com/mirrors/nvm/raw/master/install.sh | bash

ENV PATH /root/.nvm/versions/node/$NODE_VERSION/bin:$PATH

RUN node --version \
    && npm --version

FROM novnc-node-18 AS laststage

ARG ALIYUN=""

RUN groupadd -r python-user && useradd -r -m -g python-user python-user

# RUN echo $PATH && whoami && dfasd
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y -f \
    wget unzip curl git build-essential libncursesw5-dev libssl-dev libsqlite3-dev tk-dev libgdbm-dev libc6-dev libbz2-dev libffi-dev zlib1g-dev # python3 python3-pip python3-tk
    # apt-get clean && rm -fr /tmp/* /var/lib/apt/lists

# USER python-user

ENV PYTHON_VERSION 3.10.6

# Set-up necessary Env vars for PyEnv
ENV PYENV_ROOT=/home/python-user/.pyenv
ENV PATH=$PYENV_ROOT/shims:$PYENV_ROOT/bin:$PATH

# Install pyenv
RUN set -ex \
    && if [ "x$ALIYUN" != "xnone" ] ; then \
      (echo https://ghproxy.com/ > /tmp/HTTP_GIT_PREFIX && git config --global url."https://ghproxy.com/https://github.com".insteadOf https://github.com); \
    fi \
    && curl "`cat /tmp/HTTP_GIT_PREFIX`https://raw.githubusercontent.com/pyenv/pyenv-installer/master/bin/pyenv-installer" | bash \
    && pyenv update \
    && if [ "x$ALIYUN" != "xnone" ] ; then wget https://npm.taobao.org/mirrors/python/$PYTHON_VERSION/Python-$PYTHON_VERSION.tar.xz -P /home/python-user/.pyenv/cache/; fi \
    && pyenv install $PYTHON_VERSION \
    && pyenv global $PYTHON_VERSION \
    && pyenv rehash

# apt install -y wget build-essential libncursesw5-dev libssl-dev libsqlite3-dev tk-dev libgdbm-dev libc6-dev libbz2-dev libffi-dev zlib1g-dev

# RUN wget https://www.python.org/ftp/python/3.11.1/Python-3.11.1.tgz && tar xzf Python-3.11.1.tgz
# RUN cd Python-3.11.1 && ./configure --enable-optimizations
# RUN cd Python-3.11.1 && make altinstall

# RUN apt-get install -y cmake pkg-config

RUN git clone https://github.com/huggingface/transformers.git && cd transformers && pip install -e . && cd .. && rm -rf transformers

COPY ./requirements.txt /home/python-user/app/requirements.txt

RUN if [ "x$ALIYUN" != "xnone" ] ; then \
      (python3 -m pip install --upgrade pip -i https://pypi.tuna.tsinghua.edu.cn/simple && python3 -m pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple); \
    else \
      python3 -m pip install --upgrade pip; \
    fi && \
    python3 -m pip install --no-cache-dir --upgrade -r /home/python-user/app/requirements.txt

# USER root

EXPOSE 8000

WORKDIR /app


ADD package.json /app/

ADD .npmrc /tmp/.npmrc2

RUN if [ "x$ALIYUN" != "xnone" ] ; then mv -f /tmp/.npmrc2 /app/.npmrc; else rm -rf  /tmp/.npmrc2; fi

RUN npm install

# # Suppress an apt-key warning about standard out not being a terminal. Use in this script is safe.
# ENV APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE=DontWarn
# # Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# # Note: this installs the necessary libs to make the bundled version of Chromium that Puppeteer
# # installs, work.


# COPY --chown=user:user ./app /home/python-user/app
ADD ./app /app/app/
ADD ./src /app/src
ADD ./tsconfig.json /app/
ADD ./rollup.config.js /app/
COPY vncmain.sh /app/vncmain.sh
RUN chmod +x /app/vncmain.sh

# RUN npm run build
# CMD ["node", "lib/bundle.esm.js"]

# docker build . -t docker.io/library/wechatbot:latest
# docker build . -t docker.io/library/wechatbot:latest --build-arg ALIYUN=none
# docker run -ti --name vnc-test -v $(cd ~;pwd)/.cache:/home/user/.cache --env-file .env -p 3000:3000 -p 8000:8000 --rm oott123/novnc:latest bash
# docker run -ti --name vnc-test -v $(cd ~;pwd)/.cache:/home/user/.cache --env-file .env -p 9000:9000 --rm docker.io/library/wechatbot:latest
# docker run -ti --name vnc-test -v $(cd ~;pwd)/.cache:/home/user/.cache --env-file .env -p 9000:9000 --rm docker.io/library/wechatbot:latest

# docker run --env-file .env -e torch_device=cpu -v $(cd ~;pwd)/.cache:/home/user/.cache -p 9000:9000  -p 8000:8000 --rm --name ai-test -ti docker.io/library/wechatbot:latest
# docker run --env-file .env --gpus all -e torch_device=cuda -v $(cd ~;pwd)/.cache:/home/user/.cache -p 9000:9000  -p 8000:8000 --rm --name ai-test -ti docker.io/library/wechatbot:latest
