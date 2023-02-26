

import os

from pathlib import Path

c_dir = str(Path(__file__).parent)

if os.environ.get("ROOT_CURRENT_CWD") is None:
  os.environ["ROOT_CURRENT_CWD"] = str(c_dir)
  if not os.path.exists("results"):
    os.makedirs("results")


import matplotlib.pyplot as plt
import IPython.display as ipd

# import json
# import math
import torch
# from torch import nn
# from torch.nn import functional as F
# from torch.utils.data import DataLoader


import sys

if c_dir not in sys.path:
    sys.path.append(c_dir)

import commons
import v_utils as utils
# from data_utils import TextAudioLoader, TextAudioCollate, TextAudioSpeakerLoader, TextAudioSpeakerCollate
from models import SynthesizerTrn
from text.symbols import symbols
from text import text_to_sequence

# from scipy.io.wavfile import write



def get_text(text, hps):
    text_norm = text_to_sequence(text, hps.data.text_cleaners)
    if hps.data.add_blank:
        text_norm = commons.intersperse(text_norm, 0)
    text_norm = torch.LongTensor(text_norm)
    return text_norm


# 如果网络不同可以直接手动下载文件， 打开下面链接 下载文件 G_1434000.pth ， 把文件放到 ./G_1434000.pth
# https://aistudio.baidu.com/aistudio/datasetdetail/190445


cachedir = Path.home() / ".cache" / "vits"

if not os.path.exists(cachedir):
    os.makedirs(cachedir)

m_path = str(cachedir) + "/G_1434000.pth"

# m_path = (os.environ.get("ROOT_CURRENT_CWD", ".") + "/G_1434000.pth")


def unbuffered(proc, stream='stdout'):
    import contextlib
    stream = getattr(proc, stream)
    # Unix, Windows and old Macintosh end-of-line
    newlines = ['\n', '\r\n', '\r']
    with contextlib.closing(stream):
        while True:
            out = []
            last = stream.read(1)
            # Don't loop forever
            if last == '' and proc.poll() is not None:
                break
            while last not in newlines:
                # Don't loop forever
                if last == '' and proc.poll() is not None:
                    break
                out.append(last)
                last = stream.read(1)
            out = ''.join(out)
            yield out


def transfare():
    import subprocess
    # import codecs
    # decoder = codecs.getincrementaldecoder("UTF-8")()
    # runSh('curl -L -o ./G_1434001.pth https://huggingface.co/yunqiang/test/resolve/main/G_1434000.pth')
    cmd = ["curl", "-L", "-o", m_path,  "https://huggingface.co/yunqiang/test/resolve/main/G_1434000.pth"]
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        # Make all end-of-lines '\n'
        universal_newlines=True,
    )
    for line in unbuffered(proc):
        print(line)

if not os.path.exists(m_path):
  transfare()


hps = utils.get_hparams_from_file(os.path.join(c_dir, "./configs/biaobei_base.json"))

net_g = SynthesizerTrn(
    len(symbols),
    hps.data.filter_length // 2 + 1,
    hps.train.segment_size // hps.data.hop_length,
    **hps.model).cpu()
_ = net_g.eval()

_ = utils.load_checkpoint(m_path, net_g, None)

def text_to_audio(text):
  length_scale = 1 #@param {type:"slider", min:0.1, max:3, step:0.05}

  stn_tst = get_text(text, hps)
  with torch.no_grad():
      x_tst = stn_tst.cpu().unsqueeze(0)
      x_tst_lengths = torch.LongTensor([stn_tst.size(0)]).cpu()
      audio = net_g.infer(x_tst, x_tst_lengths, noise_scale=.667, noise_scale_w=0.8, length_scale=length_scale)[0][0,0].data.cpu().float().numpy()
      return audio,hps.data.sampling_rate

import soundfile as sf

import uuid

def text_to_audio_bypes(text):

    wav,rate = text_to_audio(text)
    audio = ipd.Audio(wav, rate=rate)
    return audio.data



def text_to_audio_file(text):
    temp_dir = "/tmp"

    random_s = "text-to-audio-" + uuid.uuid4().hex

    wav_file_path = os.path.join(temp_dir, random_s + ".wav")

    wav,rate = text_to_audio(text)
    import soundfile as sf

    sf.write(wav_file_path,wav,samplerate=rate)
    return wav_file_path

if __name__ == "__main__":
  text = "\u4E0B\u9762\u7ED9\u5927\u5BB6\u7B80\u5355\u4ECB\u7ECD\u4E00\u4E0B\u600E\u4E48\u4F7F\u7528\u8FD9\u4E2A\u6559\u7A0B\u5427\uFF01\u9996\u5148\u6211\u4EEC\u8981\u6709\u9B54\u6CD5\uFF0C\u624D\u80FD\u8BBF\u95EE\u5230\u8C37\u6B4C\u7684\u4E91\u5E73\u53F0\u3002\u70B9\u51FB\u8FDE\u63A5\u5E76\u66F4\u6539\u8FD0\u884C\u65F6\u7C7B\u578B\uFF0C\u8BBE\u7F6E\u786C\u4EF6\u52A0\u901F\u5668\u4E3AGPU\u3002\u7136\u540E\uFF0C\u6211\u4EEC\u518D\u4ECE\u5934\u5230\u5C3E\u6328\u4E2A\u70B9\u51FB\u6BCF\u4E2A\u4EE3\u7801\u5757\u7684\u8FD0\u884C\u6807\u5FD7\u3002\u53EF\u80FD\u9700\u8981\u7B49\u5F85\u4E00\u5B9A\u7684\u65F6\u95F4\u3002\u5F53\u6211\u4EEC\u8FDB\u884C\u5230\u8BED\u97F3\u5408\u6210\u90E8\u5206\u65F6\uFF0C\u5C31\u53EF\u4EE5\u66F4\u6539\u8981\u8BF4\u7684\u6587\u672C\uFF0C\u5E76\u8BBE\u7F6E\u4FDD\u5B58\u7684\u6587\u4EF6\u540D\u5566\u3002" #@param {type: 'string'}

  audio,rate = text_to_audio(text)

  ipd.display(ipd.Audio(audio, rate=rate))

  filename = 'test' #@param {type: "string"}
  audio_path = f'./{filename}.wav'

  sf.write(audio_path,audio,samplerate=rate)
