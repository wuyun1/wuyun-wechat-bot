import os
from fastapi.responses import HTMLResponse, FileResponse, StreamingResponse
from fastapi import FastAPI, File, UploadFile, Request, Form, Header, Query, Response
import uvicorn
import asyncio
from pdf import pdf_to_word
import logging
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

import uuid

env_access_token = os.environ.get("PDF_API_ACCESS_TOKEN", "abc1234")

@app.post("/pdf-to-word")
async def http_pdf_to_word(
    file: UploadFile = File(description="file as UploadFile"),
    is_get_file_path = Query(None),
    access_token_form: str = Form(None, alias="access_token"),
    access_token_header: str = Header(None, alias="access_token", )
):

    access_token = ""
    if access_token_form is not None:
        access_token = access_token_form

    if access_token is None:
        access_token = access_token_header

    if access_token != env_access_token:
        return Response('''{
            "error": "无权限访问 access_token 不对"
        }''', status_code= 403)

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


        os.remove(pdf_file_path)


        if is_get_file_path is not None:
            return {
                "file_path": word_file_path
            }

        respose = FileResponse(path=word_file_path, filename=word_file_name)

        return respose
    finally:
        async def clean():
            await asyncio.sleep(20)
            if(os.path.exists(word_file_path)):
                os.remove(word_file_path)
        asyncio.create_task(clean())


@app.get("/get-file")
async def http_pdf_to_word(
    file_path = Query(),
    access_token_query: str = Query(None, alias="access_token"),
    access_token_header: str = Header(None, alias="access_token", )
):

    access_token = ""
    if access_token_query is not None:
        access_token = access_token_query

    if access_token is None:
        access_token = access_token_header

    if access_token != env_access_token:
        return Response('''{
            "error": "无权限访问 access_token 不对"
        }''', status_code= 403)

    if(os.path.exists(file_path)):
        respose = FileResponse(path=file_path, filename=os.path.basename(file_path))

        return respose
    else:
        return Response('''{
            "error": "文件已经过期"
        }''', status_code= 404)



current_path = os.path.dirname(os.path.abspath(__file__))

pdf_html_file_path = os.path.join(current_path, "../src/pdf.html")

@app.get("/", response_class=HTMLResponse)
async def index():
    with open(pdf_html_file_path, "r") as f:
        html = f.read()
    return html

if __name__ == "__main__":
    uvicorn.run("pdf-api:app", host="0.0.0.0", port=3000)
