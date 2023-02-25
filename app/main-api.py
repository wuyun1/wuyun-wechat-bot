import os
from fastapi.responses import HTMLResponse, FileResponse, StreamingResponse
from fastapi import FastAPI, File, UploadFile, Request
import uvicorn
from answer import answer
from pydantic import BaseModel
from typing import Any, Union
import traceback
import threading
import string
import random
from pdf import pdf_to_word
import logging
import time
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins= ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextItem(BaseModel):
    text: str = "旅行者们，你好啊"

import uuid


@app.post("/text-to-audio")
async def http_text_to_audio(
    text_item: TextItem,
):

    wav_file_path = "/tmp/test.wav"
    try:
        from  vits.vits import text_to_audio_file
        wav_file_path = text_to_audio_file(text_item.text)

        respose = FileResponse(path=wav_file_path, filename= os.path.basename(wav_file_path))
        return respose
    finally:
        async def clean():
            await asyncio.sleep(10)
            if(os.path.exists(wav_file_path)):
                os.remove(wav_file_path)
        asyncio.create_task(clean())

@app.post("/pdf-to-word")
async def http_pdf_to_word(
    file: UploadFile = File(description="file as UploadFile"),
):
    word_file_path = "/tmp/test.docx"

    try:
        pdf_file_name = file.filename

        if not pdf_file_name.endswith('.pdf'):
            return "请上传 pdf 文件"

        logging.info(f"upload filename: {pdf_file_name} !")

        temp_dir = "/tmp"

        file_name = os.path.basename(pdf_file_name)

        random_s = "pdf-to-word-" + uuid.uuid4().hex

        pdf_file_path = os.path.join(temp_dir, random_s + pdf_file_name)
        word_file_name = file_name + '.docx'
        word_file_path = os.path.join(temp_dir, random_s + word_file_name)

        content = file.file.read()
        with open(pdf_file_path, 'wb') as f:
            f.write(content)

        pdf_to_word(pdf_file_path, word_file_path)

        respose = FileResponse(path=word_file_path, filename=word_file_name)

        os.remove(pdf_file_path)

        return respose
    finally:
        async def clean():
            await asyncio.sleep(10)
            if(os.path.exists(word_file_path)):
                os.remove(word_file_path)
        asyncio.create_task(clean())


current_path = os.path.dirname(os.path.abspath(__file__))

chatbot_html_file_path = os.path.join(current_path, "../src/chatbot.html")
pdf_html_file_path = os.path.join(current_path, "../src/pdf.html")
audio_html_file_path = os.path.join(current_path, "../src/text-tu-audio.html")


@app.get("/pdf", response_class=HTMLResponse)
async def index():
    with open(pdf_html_file_path, "r") as f:
        html = f.read()
    return html


@app.get("/text-to-audio", response_class=HTMLResponse)
async def index():
    with open(audio_html_file_path, "r") as f:
        html = f.read()
    return html

class Question(BaseModel):
    text: str = "用户: 写首诗\n小元: "
    # description: Union[str, None] = None
    max_len: Union[float, None] = 50
    temperature: Union[float, None] = 1.0
    top_p: Union[float, None] = 0.95
    top_k: Union[float, None]
    sample: Union[None, bool] = True


@app.post('/api/generate')
async def api_generate(q: Question, request: Request):
    """
    curl -X 'POST' \
    'http://localhost:8000/api/generate' \
    -H 'accept: application/json' \
    -H 'Content-Type: application/json' \
    -d '{
    "text": "用户: 用 markdown 格式写一篇介绍 python 冒泡排序的文章\n小元",
    "max_len": 5000,
    "temperature": 1,
    "top_p": 0.95,
    "sample": true
    }'
    """
    data = await request.json()
    if 'text' not in data or not isinstance(data['text'], str):
        return {
            'ok': False,
            'error': 'Invalid text in post data',
        }
    try:

        generation_params = {
            "text": q.text,
            "max_new_tokens": q.max_len,
            "sample": q.sample,
            "top_k": q.top_k,
            "top_p": q.top_p,
            "request": request,
            "temperature": q.temperature
        }

        ret = answer(**generation_params)

        return {
            'ok': True,
            'text': ret,
        }

    except Exception:
        return {
            'ok': False,
            'error': traceback.format_exc(),
        }


@app.post('/api/generate')
async def api_generate(q: Question, request: Request):
    data = await request.json()
    if 'text' not in data or not isinstance(data['text'], str):
        return {
            'ok': False,
            'error': 'Invalid text in post data',
        }
    try:

        generation_params = {
            "text": q.text,
            "max_new_tokens": q.max_len,
            "sample": q.sample,
            "top_k": q.top_k,
            "top_p": q.top_p,
            "request": request,
            "temperature": q.temperature
        }

        ret = answer(**generation_params)

        return {
            'ok': True,
            'text': ret,
        }

    except Exception:
        return {
            'ok': False,
            'error': traceback.format_exc(),
        }

# from queue import Queue
import asyncio
from concurrent.futures import ThreadPoolExecutor
global_executor = ThreadPoolExecutor(2)

async def generate_text_async(q: Question, request: Request):

    # qu = Queue()
    queue = asyncio.Queue()

    global_loop = asyncio.get_event_loop()

    request.state.is_done = False
    # count = 0

    async def check_is_done():
        while not request.state.is_done:
            await asyncio.sleep(.2)
            is_disconnected = await request.is_disconnected()
            if is_disconnected:
                request.state.is_done = True
                break

    def my_callback(x):
        # nonlocal count

        if request.state.is_done :
            raise Exception("end")

        # queue.put_nowait(x)
        global_loop.call_soon_threadsafe(queue.put_nowait, x)

        # i_next_item = f"count = {count} \t is_done = {request.state.is_done}"
        # print(i_next_item)
        # count += 1
        # asyncio.run(check_is_done)
        # asyncio.run_coroutine_threadsafe(check_is_done)
        # global_loop.run_until_complete(check_is_done)


        # qu.join() # Blocks until task_done is called

    generation_params = {
        "text": q.text,
        "max_new_tokens": q.max_len,
        "sample": q.sample,
        "ondata": my_callback,
        "top_k": q.top_k,
        "top_p": q.top_p,
        # "request": request,
        "temperature": q.temperature
    }


    def task():
        # answer(**generation_params)

        try:
            return answer(**generation_params)
        except:
            pass
        # nonlocal count
        # while True:
        #     time.sleep(1)
        #     generation_params["ondata"](f"data = {count}")

    global_loop.run_in_executor(global_executor, task)

    asyncio.create_task(check_is_done())


    # request.state.is_done = True


    # Consumer
    while True:
        # print(f"is_done = {is_done}")
        next_item = await queue.get() # Blocks until an input is available
        # await asyncio.sleep(1)

        if next_item is None:
            break
        yield next_item
        # queue.task_done() # Unblocks the producer, so a new iteration can start



@app.post("/api/generate_text_async")
async def generate_text(q: Question, request: Request):
    return StreamingResponse(generate_text_async(q, request=request), media_type="text/event-stream")




@app.get("/", response_class=HTMLResponse)
async def index():
    with open(chatbot_html_file_path, "r") as f:
        html = f.read()
    return html


if __name__ == "__main__":
    uvicorn.run("main-api:app", host="0.0.0.0", port=3000)
