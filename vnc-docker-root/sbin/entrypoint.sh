#!/bin/bash

set -eo pipefail

[[ $DEBUG == true ]] && set -x

export VNC_PASSWORD=''
export DISPLAY=:11

echo -e "$VNC_PASSWD\n$VNC_PASSWD\n\n" | sudo -Hu user vncpasswd
if [ ! -d /etc/vnc ]; then
    mkdir /etc/vnc
fi
echo 'openbox-session' > /etc/vnc/xstartup

# Clear X lock.
# Some container host (e.g. hyper.sh) will keep /tmp even after a restart.
if [ -f /tmp/.X11-lock ]; then
    rm -f /tmp/.X11-lock
fi


set -eo pipefail

[[ $DEBUG == true ]] && set -x

if [ "$USER_PASSWD" != '' ]; then
    # set user password
    echo "user:$USER_PASSWD" | chpasswd
    # and give sudo power to user
    echo '' >> /etc/sudoers
    echo 'user  ALL=(ALL:ALL) ALL' >> /etc/sudoers
fi

set +e

case ${1} in
  help)
    echo "No help!"
    ;;
  start)
    vncsession user :11
    # tmux new -d -s tigervnc
    # tmux send-keys -t tigervnc "vncsession user :11" C-m
    sleep 2
    touch ~/.Xauthority
    xauth add `sudo --preserve-env -Hu user xauth list $DISPLAY`
    # tmux capture-pane -t tigervnc -peN
    tmux new -d -s nginx
    tmux send-keys -t nginx "nginx -g 'daemon off;'" C-m
    sleep 2
    tmux capture-pane -t nginx -peN
    tmux new -d -s websocketify
    tmux send-keys -t websocketify "sudo -Hu user /_app/src/websockify/run 9001 127.0.0.1:5911" C-m
    sleep 2
    tmux capture-pane -t websocketify -peN
    sudo --preserve-env --preserve-env=PATH -Hu user /app/vncmain.sh "$@"
    ;;
  *)
    exec "$@"
    ;;
esac

# tmux new -d -s nginx
# tmux send-keys -t nginx "sleep 500 && sleep 500" C-m

tmux list-sessions | awk 'BEGIN{FS=":"}{print $1}' | xargs -I {} tmux send-keys -t {} C-c C-d || echo No sessions to kill
tmux list-sessions | awk 'BEGIN{FS=":"}{print $1}' | xargs -I {} tmux send-keys -t {} C-c C-d || echo No sessions to kill
tmux list-sessions | awk 'BEGIN{FS=":"}{print $1}' | xargs -I {} tmux wait-for {} || echo No sessions to wait-for

sleep 1

exit 0
