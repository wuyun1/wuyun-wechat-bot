import os
from fastapi.responses import HTMLResponse, FileResponse, StreamingResponse
from fastapi import FastAPI, File, UploadFile, Response, status, Request
import uvicorn
from utils import global_executor
import asyncio
from answer import answer, async_answer
from pydantic import BaseModel
from typing import Any, Union
import traceback
import threading
import string
import random
from pdf import pdf_to_word
import logging
import time

logging.basicConfig(level=logging.INFO)


def sleep(seconds: int = 1):
    logging.info(f"Sleeping for {seconds} seconds")
    time.sleep(seconds)

# from typing import List


app = FastAPI()


@app.get("/test")
async def test(response: Response):
    sleep(1)
    response.status_code = status.HTTP_403_FORBIDDEN
    return {"status": "error", "error": "Forbidden"}


def random_string(letter_count, digit_count):
    str1 = ''.join((random.choice(string.ascii_letters)
                   for x in range(letter_count)))
    str1 += ''.join((random.choice(string.digits) for x in range(digit_count)))

    sam_list = list(str1)  # it converts the string to list.
    # It uses a random.shuffle() function to shuffle the string.
    random.shuffle(sam_list)
    final_string = ''.join(sam_list)
    return final_string


@app.post("/pdf-to-word")
async def create_upload_files(
    file: UploadFile = File(description="file as UploadFile"),
):
    pdf_file_name = file.filename

    # return { "filename": pdf_file_name, "dir": file, }

    if not pdf_file_name.endswith('.pdf'):
        return "请上传 pdf 文件"

    logging.info(f"upload filename: {pdf_file_name} !")

    temp_dir = "/tmp"

    file_name = os.path.basename(pdf_file_name)

    random_s = "pdf-to-word-" + random_string(8, 4)

    pdf_file_path = os.path.join(temp_dir, random_s + pdf_file_name)
    word_file_name = file_name + '.docx'
    word_file_path = os.path.join(temp_dir, random_s + word_file_name)

    content = file.file.read()
    with open(pdf_file_path, 'wb') as f:
        f.write(content)

    pdf_to_word(pdf_file_path, word_file_path)

    respose = FileResponse(path=word_file_path, filename=word_file_name)

    os.remove(pdf_file_path)

    def my_func():
        sleep(5000)
        logging.info(f"开始删除文件: {word_file_path}")
        os.remove(word_file_path)
        pass

    t = threading.Thread(target=my_func)

    t.start()

    return respose


# @app.get("/")
# async def main():
#     content = """
# <body>
# <form action="/pdf-to-word" enctype="multipart/form-data" method="post">
# <input name="file" type="file" >
# <input type="submit">
# </form>
# </body>
#     """
#     return HTMLResponse(content=content)


# import uvicorn

# if __name__ == "__main__":
#     config = uvicorn.Config("main-api:app", port=8000, log_level="info", reload=False)
#     server = uvicorn.Server(config)
#     server.run()

# cd app && uvicorn main-api:app --host 0.0.0.0 --port 8000 --reload


class Question(BaseModel):
    text: str = "用户: 写首诗\n小元: "
    # description: Union[str, None] = None
    max_len: Union[float, None] = 50
    temperature: Union[float, None] = 1.0
    top_p: Union[float, None] = 0.95
    sample: Union[None, bool] = True


def myanswer(dictargs):
    return answer(
        **dictargs
    )


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

        args = {
            'text': data['text'],
            'max_new_tokens': data.get('max_len', 50),
            'temperature': data.get('temperature', 1.0),
            'top_p': data.get('top_p', 0.95),
            'sample': data.get('sample', True)
        }

        global_loop = asyncio.get_event_loop()
        ret = await global_loop.run_in_executor(global_executor, myanswer, args)
        # ret = myanswer(args)

        return {
            'ok': True,
            'text': ret,
        }

    except Exception:
        return {
            'ok': False,
            'error': traceback.format_exc(),
        }


async def generate_text_async(q: Question, request: Any = None):
    generation_params = {
        "text": q.text,
        "max_new_tokens": q.max_len,
        "sample": q.sample,
        # "top_k": 50,
        "top_p": q.top_p,
        "request": request,
        "temperature": q.temperature
    }

    async for token in async_answer(**generation_params):
        yield str(token)


@app.post("/api/generate_text_async")
async def generate_text(text_request: Question, request: Request):
    return StreamingResponse(generate_text_async(text_request, request=request), media_type="text/event-stream")


current_path = os.path.dirname(os.path.abspath(__file__))

chatbot_html_file_path = os.path.join(current_path, "chatbot.html")


@app.get("/", response_class=HTMLResponse)
async def index():
    with open(chatbot_html_file_path, "r") as f:
        html = f.read()
    return html


@app.exception_handler(BrokenPipeError)
async def handle_broken_pipe(request, exc):
    print(request)
    print(exc)
    # do some cleanup work if needed
    pass


if __name__ == "__main__":
    uvicorn.run("main-api:app", host="0.0.0.0", port=3000)
