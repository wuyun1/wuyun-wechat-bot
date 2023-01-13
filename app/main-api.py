import logging
import time

logging.basicConfig(level=logging.INFO)

def sleep(seconds: int = 1):
    logging.info(f"Sleeping for {seconds} seconds")
    time.sleep(seconds)

# from typing import List

from fastapi import FastAPI, File, UploadFile, Response, status
from fastapi.responses import HTMLResponse,FileResponse

app = FastAPI()

@app.get("/test")
async def test(response: Response):
    sleep(1)
    response.status_code = status.HTTP_403_FORBIDDEN
    return {"status": "error", "error": "Forbidden"}

from pdf2docx import Converter

def pdf_to_word(pdf_file_path, word_file_path):
    cv = Converter(pdf_file_path)
    cv.convert(word_file_path)
    cv.close()

import random
import string

def random_string(letter_count, digit_count):
    str1 = ''.join((random.choice(string.ascii_letters) for x in range(letter_count)))
    str1 += ''.join((random.choice(string.digits) for x in range(digit_count)))

    sam_list = list(str1) # it converts the string to list.
    random.shuffle(sam_list) # It uses a random.shuffle() function to shuffle the string.
    final_string = ''.join(sam_list)
    return final_string

import os

import threading

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

    random_s = "pdf-to-word-" + random_string(8,4)

    pdf_file_path = os.path.join(temp_dir, random_s + pdf_file_name )
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


@app.get("/")
async def main():
    content = """
<body>
<form action="/pdf-to-word" enctype="multipart/form-data" method="post">
<input name="file" type="file" >
<input type="submit">
</form>
</body>
    """
    return HTMLResponse(content=content)


# import uvicorn

# if __name__ == "__main__":
#     config = uvicorn.Config("main-api:app", port=8000, log_level="info", reload=False)
#     server = uvicorn.Server(config)
#     server.run()

# cd app && uvicorn main-api:app --host 0.0.0.0 --port 8000 --reload
