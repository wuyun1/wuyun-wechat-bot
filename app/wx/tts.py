import os
from fastapi.responses import HTMLResponse, FileResponse, Response
from pydantic import BaseModel
from fastapi import APIRouter

router = APIRouter()

@router.post("/tts-hello")
def hello():
  return {
    "hello": "world",
  }


class TextItem(BaseModel):
    text: str = "旅行者们，你好啊"

import asyncio

@router.post("/text-to-audio")
async def http_text_to_audio(
    text_item: TextItem,
):
    if text_item.text is None:
      return Response('''{
          "error": "提交数据格式不对"
      }''', status_code= 400);

    wav_file_path = "/tmp/test.wav"
    try:
        from vits.vits import text_to_audio_file
        wav_file_path = text_to_audio_file(text_item.text)

        respose = FileResponse(path=wav_file_path, filename= os.path.basename(wav_file_path))
        return respose
    finally:
        async def clean():
            await asyncio.sleep(20)
            if(os.path.exists(wav_file_path)):
                os.remove(wav_file_path)
        asyncio.create_task(clean())



current_path = os.path.dirname(os.path.abspath(__file__))

audio_html_file_path = os.path.join(current_path, "../../src/text-tu-audio.html")


@router.get("/text-to-audio", response_class=HTMLResponse)
async def index():
    with open(audio_html_file_path, "r") as f:
        html = f.read()
    return html
