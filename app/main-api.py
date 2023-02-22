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

logging.basicConfig(level=logging.INFO)

app = FastAPI()

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
    try:
        pdf_file_name = file.filename

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

        return respose
    finally:
        os.remove(word_file_path)


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


if __name__ == "__main__":
    uvicorn.run("main-api:app", host="0.0.0.0", port=3000)
