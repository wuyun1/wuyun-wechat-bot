from fastapi import FastAPI
import uvicorn
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

# import wx.tts as tts_router
import wx.pdf as pdf_router

app.include_router(pdf_router.router)
# app.include_router(tts_router.router)

if __name__ == "__main__":
    uvicorn.run("wx-api:app", host="0.0.0.0", port=3000)
