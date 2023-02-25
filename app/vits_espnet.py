


# NOTE: pip shows imcompatible errors due to preinstalled libraries but you do not need to care
# !pip install -q espnet==0.10.6 pyopenjtalk==0.2 pypinyin==0.44.0 parallel_wavegan==0.5.4 gdown==4.4.0 espnet_model_zoo

#
# #@title Choose Mandarin model { run: "auto" }
# lang = 'Mandarin'
# tag = 'https://zenodo.org/record/5521404/files/tts_train_full_band_vits_raw_phn_pypinyin_g2p_phone_train.total_count.ave.zip?download=1'
tag = 'https://huggingface.co/yunqiang/test/resolve/main/tts_train_full_band_vits_raw_phn_pypinyin_g2p_phone_train.total_count.ave.zip'
# tag = '/Users/wuyun/Desktop/tts_train_full_band_vits_raw_phn_pypinyin_g2p_phone_train.total_count.ave.zip'
# tag = 'kan-bayashi/csmsc_full_band_vits' #@param ["kan-bayashi/csmsc_tacotron2", "kan-bayashi/csmsc_transformer", "kan-bayashi/csmsc_fastspeech", "kan-bayashi/csmsc_fastspeech2", "kan-bayashi/csmsc_conformer_fastspeech2", "kan-bayashi/csmsc_vits", "kan-bayashi/csmsc_full_band_vits"] {type: "string"}
vocoder_tag = "none" #@param ["none", "parallel_wavegan/csmsc_parallel_wavegan.v1", "parallel_wavegan/csmsc_multi_band_melgan.v2", "parallel_wavegan/csmsc_hifigan.v1", "parallel_wavegan/csmsc_style_melgan.v1"] {type:"string"}


from espnet2.bin.tts_inference import Text2Speech
from espnet2.utils.types import str_or_none

text2speech = Text2Speech.from_pretrained(
    model_tag=str_or_none(tag),
    vocoder_tag=str_or_none(vocoder_tag),
    # device="cuda",
    device="cpu",
    # Only for Tacotron 2 & Transformer
    threshold=0.5,
    # Only for Tacotron 2
    minlenratio=0.0,
    maxlenratio=10.0,
    use_att_constraint=False,
    backward_window=1,
    forward_window=3,
    # Only for FastSpeech & FastSpeech2 & VITS
    speed_control_alpha=1.0,
    # Only for VITS
    noise_scale=0.333,
    noise_scale_dur=0.333,
)



import time
import torch

# decide the input sentence by yourself
# print(f"Input your favorite sentence in {lang}.")
# x = input()


def text_to_audio(text):

    # synthesis
    with torch.no_grad():
        start = time.time()
        wav = text2speech(x)["wav"]
    rtf = (time.time() - start) / (len(wav) / text2speech.fs)
    print(f"RTF = {rtf:5f}")


    data = wav.view(-1).cpu().numpy()

    return (data , text2speech.fs)


if __name__ == "__main__":

    x = "\u4E0B\u9762\u7ED9\u5927\u5BB6\u7B80\u5355\u4ECB\u7ECD\u4E00\u4E0B\u600E\u4E48\u4F7F\u7528\u8FD9\u4E2A\u6559\u7A0B\u5427\uFF01\u9996\u5148\u6211\u4EEC\u8981\u6709\u9B54\u6CD5\uFF0C\u624D\u80FD\u8BBF\u95EE\u5230\u8C37\u6B4C\u7684\u4E91\u5E73\u53F0\u3002\u70B9\u51FB\u8FDE\u63A5\u5E76\u66F4\u6539\u8FD0\u884C\u65F6\u7C7B\u578B\uFF0C\u8BBE\u7F6E\u786C\u4EF6\u52A0\u901F\u5668\u4E3AGPU\u3002\u7136\u540E\uFF0C\u6211\u4EEC\u518D\u4ECE\u5934\u5230\u5C3E\u6328\u4E2A\u70B9\u51FB\u6BCF\u4E2A\u4EE3\u7801\u5757\u7684\u8FD0\u884C\u6807\u5FD7\u3002\u53EF\u80FD\u9700\u8981\u7B49\u5F85\u4E00\u5B9A\u7684\u65F6\u95F4\u3002\u5F53\u6211\u4EEC\u8FDB\u884C\u5230\u8BED\u97F3\u5408\u6210\u90E8\u5206\u65F6\uFF0C\u5C31\u53EF\u4EE5\u66F4\u6539\u8981\u8BF4\u7684\u6587\u672C\uFF0C\u5E76\u8BBE\u7F6E\u4FDD\u5B58\u7684\u6587\u4EF6\u540D\u5566\u3002"


    # let us listen to generated samples
    from IPython.display import display, Audio

    wav, rate = text_to_audio(x)

    display(Audio(wav, rate=rate))

    import soundfile as sf

    sf.write("./test.wav", wav,samplerate=rate)
