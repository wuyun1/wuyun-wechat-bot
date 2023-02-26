

import os
from fastapi.responses import HTMLResponse, FileResponse
from fastapi import APIRouter

from fastapi import File, UploadFile, Header, Query, Response,Form
from pydantic import BaseModel
import asyncio
from pdf import pdf_to_word
import logging
import uuid

env_access_token = os.environ.get("PDF_API_ACCESS_TOKEN", 'abc1234')


router = APIRouter()

@router.post("/pdf-to-word")
async def http_pdf_to_word(
    # r: Request,
    file: UploadFile = File(description="pdf file as UploadFile"),
    is_get_file_path = Query(None),
    access_token_query: str = Query(None, alias="access_token"),
    access_token_form: str = Form(None, alias="access_token"),
    access_token_header: str = Header(None, alias="access_token", ),
):

    if env_access_token != None:
        access_token = ""
        if access_token_query != None:
            access_token = access_token_query

        if access_token == "" and access_token_header != None:
            access_token = access_token_header
        if access_token == "" and access_token_form != None:
            access_token = access_token_form

        if access_token != env_access_token:
            return Response('''{
                "error": "无权限访问 access_token 不对"
            }''', status_code= 403)

    word_file_path = "/tmp/test.docx"

    try:
        pdf_file_name = file.filename

        if not pdf_file_name.endswith('.pdf'):
            return Response('''{
                "error": "请上传 pdf 文件"
            }''', status_code= 403)

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

@router.get("/get-file")
async def get_http_word_file(
    file_path = Query(),
    access_token_query: str = Query(None, alias="access_token"),
    access_token_header: str = Header(None, alias="access_token", )
):
    if env_access_token != None:

        access_token = ""
        if access_token_query != None:
            access_token = access_token_query

        if access_token == "":
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


class UploadFileBase64Item(BaseModel):
    base64: str = None
    filename: str = None


import base64
import io

@router.post("/pdf-to-word-base64")
async def http_pdf_to_word_base64(
    # r: Request,
    body: UploadFileBase64Item,
    access_token_query: str = Query(None, alias="access_token"),
    access_token_header: str = Header(None, alias="access_token", ),
):

    if body.base64 == None or body.filename == None or not body.filename.endswith('.pdf'):
        return Response('''{
            "error": "请上传 pdf 文件"
        }''', status_code= 403)

    filedata = base64.b64decode(body.base64)

    uploadFile = UploadFile(io.BytesIO(filedata), filename=body.filename)

    res = await http_pdf_to_word(uploadFile, is_get_file_path = None, access_token_query=access_token_query, access_token_header=access_token_header)

    if isinstance(res, FileResponse):
        res_file_res:  FileResponse = res
        with open(res_file_res.path, 'rb') as file:
            bytes_data = file.read(999999)
            # buffer = io.BytesIO(bytes_data)
            res_base64 = base64.b64encode(bytes_data)
            return {
                "base64": res_base64,
                "filename": res_file_res.filename
            }

    return res


current_path = os.path.dirname(os.path.abspath(__file__))

pdf_html_file_path = os.path.join(current_path, "../../src/pdf.html")

@router.get("/pdf", response_class=HTMLResponse)
async def index():
    with open(pdf_html_file_path, "r") as f:
        html = f.read()
    return html
