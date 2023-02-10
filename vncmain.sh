#!/bin/bash

# Set them to empty is NOT SECURE but avoid them display in random logs.
# export VNC_PASSWD=''
# export USER_PASSWD=''

# curl -L https://github.com/pyenv/pyenv-installer/raw/master/bin/pyenv-installer | bash

# export PATH="$HOME/.pyenv/bin:$PATH"

# pyenv update

# pyenv install 3.9.9

# pyenv global 3.9.9

# pip install --upgrade pip
# echo $(id)

# echo $(which python) $(python --version)
# echo $(which pip) $(pip --version)

# # pip freeze

# echo $PATH

tmux new -d -s text-api
tmux send-keys -t text-api "cd /app/app && python3 -m uvicorn main-api:app --host 0.0.0.0 --port 8000" C-m


echo '运行下面命令登录你的微信：

docker exec -ti '`hostname`' bash
sudo --preserve-env --preserve-env=PATH -Hu user bash
tmux new -d -s wx
tmux send-keys -t wx "cd /app && npm run dev2" C-m
tmux a -t wx

'


tail -n0 -f $0


# (cd /app && npm run dev2)
