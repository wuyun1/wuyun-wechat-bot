from fastapi import Request
import time
import asyncio
import os
import torch
import transformers
from transformers.generation.utils import (logging)
from typing import Any

# import os
# os.environ["TOKENIZERS_PARALLELISM"] = "false"

# MODEL_NAME = "ClueAI/ChatYuan-large-v1"
# MODEL_CLASS = T5ForConditionalGeneration

MODEL_NAME = os.environ.get('MODEL_NAME', "EleutherAI/pythia-70m-deduped")
_MODEL_CLASS = os.environ.get('MODEL_CLASS', "GPTNeoXForCausalLM")
_MODEL_TOKENIZER = os.environ.get('MODEL_TOKENIZER', "AutoTokenizer")

MODEL_CLASS = eval(f"transformers.{_MODEL_CLASS}")
MODEL_TOKENIZER_CLASS = eval(f"transformers.{_MODEL_TOKENIZER}")

tokenizer = MODEL_TOKENIZER_CLASS.from_pretrained(MODEL_NAME)


logger = logging.get_logger(__name__)

model = MODEL_CLASS.from_pretrained(
    MODEL_NAME,
)

torch_device = os.environ.get('torch_device', 'cpu')
device = torch.device(torch_device)

model.to(device)


def preprocess(text):
    text = text.replace("\n", "\\n").replace("\t", "\\t")
    return text


def postprocess(text):
    return text.replace("\\n", "\n").replace("\\t", "\t")


def answer(text="", sample=True, top_p=1, temperature=0.7, max_new_tokens=40, encoding=None, **kwargs):
    '''sample：是否抽样。生成任务，可以设置为True;
    top_p：0-1之间，生成的内容越多样'''

    encoding = encoding is not None if encoding else tokenizer(text=[preprocess(
        text)], truncation=True, max_length=768, return_tensors="pt").to(device)  # padding=True,

    args = {
        **kwargs,
        **encoding,
        "return_dict_in_generate": True,
        "output_scores": False,
        "max_new_tokens": max_new_tokens,
        "num_beams": 1,
        "length_penalty": 0.6,
    }

    if sample:
        args.update(
            {
                "do_sample": True,
                "top_p": top_p,
                "temperature": temperature,
                "no_repeat_ngram_size": 3,
                "length_penalty": None
            }
        )
    # if MODEL_NAME == "EleutherAI/pythia-70m-deduped" and args["pad_token_id"] is None and args["eos_token_id"] is None:
    #     args.update(
    #         {
    #             "pad_token_id": tokenizer.pad_token_id,
    #             "eos_token_id": tokenizer.eos_token_id,
    #         }
    #     )

    out = model.generate(
        **kwargs,
        **encoding,
        return_dict_in_generate=True,
        output_scores=False,
        max_new_tokens=max_new_tokens,
        num_beams=1,
        length_penalty=0.6
    )

    res_sequences = out["sequences"]
    if MODEL_NAME == "EleutherAI/pythia-70m-deduped":
        res_sequences = [out["sequences"][0][len(encoding["input_ids"][0]):]]

    # out_text = tokenizer.batch_decode(res_sequences, skip_special_tokens=True)
    # res = postprocess(out_text[0])
    # # res = res.replace(text, "", 1)
    # return res

    if kwargs["prefix_allowed_tokens_fn"] is None:
        out_text = tokenizer.batch_decode(res_sequences, skip_special_tokens=True)
        res = postprocess(out_text[0])
        # res = res.replace(text, "", 1)
        return res
    else:
        out_text = tokenizer.decode(res_sequences[0][-1:], skip_special_tokens=True)
        res = postprocess(out_text)
        return res


async def async_answer(
    text: str,
    sample: bool = True,
    top_p: float = 1,
    temperature: float = 0.7,
    max_new_tokens: int = 40,
    request: Request = None,
):
    """生成对话"""
    encoding = tokenizer(
        text=[preprocess(text)], truncation=True, max_length=768, return_tensors="pt"
    ).to(device)

    queue = asyncio.Queue()
    global_loop = asyncio.get_event_loop()

    # request.state.is_close = False

    _count = 0

    def my_prefix_allowed_tokens_fn(_, input_ids):
        nonlocal _count
        _count += 1
        if request is not None:
            request.state.is_close = asyncio.run(request.is_disconnected())
            if request.state.is_close:
                queue.put_nowait(None)
                raise asyncio.CancelledError()
        if _count > 1 :
            chunk = input_ids[-1:]
            # print(chunk[0])
            global_loop.call_soon_threadsafe(queue.put_nowait, chunk)
            time.sleep(0)

    args = {
        **encoding,
        "return_dict_in_generate": True,
        "prefix_allowed_tokens_fn": my_prefix_allowed_tokens_fn,
        "output_scores": False,
        "max_new_tokens": max_new_tokens,
        "num_beams": 1,
        "length_penalty": 0.6,
    }

    if sample:
        args.update(
            {
                "do_sample": True,
                "top_p": top_p,
                "temperature": temperature,
                "no_repeat_ngram_size": 3,
                "length_penalty": None
            }
        )

    async def do_consumer():
        while True:
            try:
                result = await queue.get()
                queue.task_done()

                if result is None:
                    break
                if result not in tokenizer.all_special_ids:
                    t = tokenizer.decode(result)
                    yield postprocess(t)
            except Exception as e:
                print("Exception caught:", e)
                # 当任务被取消时，停止循环
                break

    do_consumer_feat = do_consumer()

    def _generate(dict):
        res = model.generate(**dict)
        # do_consumer_feat.athrow(Exception, "取消")
        queue.put_nowait(None)
        return res

    from utils import global_executor

    out_feature = global_loop.run_in_executor(global_executor, _generate, args)

    async for result in do_consumer_feat:
        yield result
        # do_consumer_feat.athrow(Exception, "取消")

    join_feat = queue.join()

    await out_feature
    await join_feat
    # await asyncio.gather(out_feature, join_feat)

    # out = await out_feature

    # res_sequences = out["sequences"]
    # if MODEL_NAME == "EleutherAI/pythia-70m-deduped":
    #     res_sequences = [out["sequences"][0][len(encoding["input_ids"][0]):]]

    # yield postprocess(tokenizer.decode(res_sequences[0][-1]))


async def main():

    # input_text = "写首诗"
    # input_text = "用户：" + input_text + "\n小元："

    print(f"示例1".center(50, "="))
    input_text = "hello baby"

    async for result in async_answer(text=input_text, sample=True, max_new_tokens=40):
        print(result, end="")

    # print(f"示例2".center(50, "="))
    # # input_text= "hello baby"

    # output_text = answer(text=input_text, sample=True, max_new_tokens=40)
    # print(f"{input_text}{output_text}")

if __name__ == "__main__":
    asyncio.run(main())
