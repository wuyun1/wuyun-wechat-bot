from transformers import T5Tokenizer, T5ForConditionalGeneration
tokenizer = T5Tokenizer.from_pretrained("ClueAI/ChatYuan-large-v1")
model = T5ForConditionalGeneration.from_pretrained("ClueAI/ChatYuan-large-v1")

# from transformers import AutoTokenizer
# 修改colab笔记本设置为gpu，推理更快
# device = torch.device('cpu')
# device = torch.device('cuda')
# device = torch.device('mps')

import torch
import os

torch_device = os.environ.get('torch_device', 'cpu')

device = torch.device(torch_device)

model.to(device)

def preprocess(text):
    text = text.replace("\n", "\\n").replace("\t", "\\t")
    return text

def postprocess(text):
    return text.replace("\\n", "\n").replace("\\t", "\t")

def answer(text, sample=True, top_p=1, temperature=0.7, max_new_tokens=4096):
    '''sample：是否抽样。生成任务，可以设置为True;
    top_p：0-1之间，生成的内容越多样'''
    text = preprocess(text)
    encoding = tokenizer(text=[text], truncation=True, padding=True, max_length=768, return_tensors="pt").to(device) 
    if not sample:
        out = model.generate(**encoding, return_dict_in_generate=True, output_scores=False, max_new_tokens=max_new_tokens, num_beams=1, length_penalty=0.6)
    else:
        out = model.generate(**encoding, return_dict_in_generate=True, output_scores=False, max_new_tokens=max_new_tokens, do_sample=True, top_p=top_p, temperature=temperature, no_repeat_ngram_size=3)
    out_text = tokenizer.batch_decode(out["sequences"], skip_special_tokens=True)
    return postprocess(out_text[0])

if __name__ == "__main__":
    input_text= "用 markdown 格式写一篇介绍 python 实现冒泡排序的文章"
    print(f"示例".center(50, "="))
    input_text = "用户：" + input_text + "\n小元："
    output_text = answer(input_text, sample=True)
    # print(output_text)
    print(f"{input_text}\n{output_text}")
