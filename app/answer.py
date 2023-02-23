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


def answer(text="", sample=True, top_p=1, temperature=0.7, ondata = None,max_new_tokens=40, encoding=None, **kwargs):
    '''sample：是否抽样。生成任务，可以设置为True;
    top_p：0-1之间，生成的内容越多样'''

    encoding = encoding is not None if encoding else tokenizer(text=[preprocess(
        text)], truncation=True, return_tensors="pt").to(device)  # padding=True,

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

    # global_loop = asyncio.new_event_loop()

    # queue = asyncio.Queue(loop = global_loop)

    if ondata is not None:
        is_first = True
        def prefix_allowed_tokens_fn(_, input_ids):
            nonlocal is_first
            if is_first:
                is_first = False
                return
            chunk = input_ids[-1:]
            str = postprocess(tokenizer.decode(chunk))
            # print(f"chunk: {str}")
            ondata(str)
            # global_loop.call_soon_threadsafe(queue.put_nowait, str)
            time.sleep(0)

        args.update(
            {
                "prefix_allowed_tokens_fn": prefix_allowed_tokens_fn,
            }
        )

    # if MODEL_NAME == "EleutherAI/pythia-70m-deduped" and args["pad_token_id"] is None and args["eos_token_id"] is None:
    #     args.update(
    #         {
    #             # "pad_token_id": 0,
    #             "eos_token_id": 0,
    #         }
    #     )



    def task():
        out = model.generate(
            **args
        )

        res_sequences = out["sequences"]
        if MODEL_NAME == "EleutherAI/pythia-70m-deduped":
            res_sequences = [out["sequences"][0][len(encoding["input_ids"][0]):]]

        # out_text = tokenizer.batch_decode(res_sequences, skip_special_tokens=True)
        # res = postprocess(out_text[0])
        # # res = res.replace(text, "", 1)
        # return res

        if ondata is None:
            out_text = tokenizer.batch_decode(res_sequences, skip_special_tokens=True)
            res = postprocess(out_text[0])
            # res = res.replace(text, "", 1)
            return res
        else:
            out_text = tokenizer.decode(res_sequences[0][-1:], skip_special_tokens=True)
            str = postprocess(out_text)
            ondata(str)
            ondata(None)
            # global_loop.call_soon_threadsafe(queue.put_nowait, str)
            # time.sleep(0)
            # global_loop.call_soon_threadsafe(queue.put_nowait, None)
            # return res
    if ondata is None:
        return task()
    else:
        # global_executor.submit(task)
        # global_loop.run_in_executor(global_executor, task)
        task()

        # global_loop.run_until_complete(task)

        # global_loop.call_soon_threadsafe(task)

        # global_loop.call_soon_threadsafe(task)
        # def gen():
        #     # count = 0
        #     def next():
        #         def then(resolve, reject):
        #             v = None
        #             async def test():
        #                 nonlocal v
        #                 v = await queue.get()
        #                 queue.task_done()

        #                 # nonlocal count
        #                 # count += 1
        #                 # await asyncio.sleep(1)
        #                 # if count > 5 :
        #                 #     return None
        #                 # return f"c{count} "
        #                 # nonlocal v
        #                 # v = await queue.get()
        #                 # queue.task_done()
        #                 # return v


        #             value = asyncio.run(test())


        #             value = v

        #             # value = asyncio.run(queue.get())
        #             # queue.task_done()

        #             # value = "aaa"

        #             is_done = False if value is None else True

        #             resolve({
        #                 "done": is_done,
        #                 "value": value
        #             })
        #         return {
        #             "then": then
        #         }
        #     return {
        #         "done": True,
        #         "next": next
        #     }
        #     # while True:
        #     #     result = await queue.get()
        #     #     queue.task_done()

        #     #     if result is None:
        #     #         break
        #     #     yield result
        #         # if result not in tokenizer.all_special_ids:
        #         #     t = tokenizer.decode(result)
        #         #     yield postprocess(t)
        # return gen
        # task()
        # async def gen():
        #     while True:
        #         result = await queue.get()
        #         queue.task_done()

        #         if result is None:
        #             break
        #         yield result
        #         # if result not in tokenizer.all_special_ids:
        #         #     t = tokenizer.decode(result)
        #         #     yield postprocess(t)
        # return gen


async def main():

    # print(f"示例1".center(50, "="))

    # input_text = "写首诗"
    # input_text = "用户：" + input_text + "\n小元："

    # output_text = answer(text=input_text, sample=True, max_new_tokens=400)
    # print(f"{input_text}{output_text}")

    input_text = " hello"

    def ondata(data):
        print(f"chunk: {data}")
        # print(f"chunk: {data}", end="")

    res = answer(
        text=input_text,
        sample=True,
        max_new_tokens=4,
        ondata=ondata
    )

    # async for item in res():
    #     print(f"res : = : {item}")


if __name__ == "__main__":
    asyncio.run(main())
