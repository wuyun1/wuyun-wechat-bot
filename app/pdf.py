# import os
# import sys
# import logging
# from configparser import ConfigParser
# from concurrent.futures import ProcessPoolExecutor

import sys

import os

from pdf2docx import Converter

def pdf_to_word(pdf_file_path, word_file_path):
    cv = Converter(pdf_file_path)
    cv.convert(word_file_path)
    cv.close()

def main():
    if len(sys.argv) < 2:
        sys.exit("参数传入错误!")
    pdf_file = sys.argv[1]  #第二个参数，此时也是一个str列表
    word_file = sys.argv[2] or None #第三个参数
    if not os.path.exists(pdf_file):
        sys.exit("pdf 文件：（" + pdf_file + "） 不存在！")
    pass

    word_file_dir = os.path.dirname(word_file)
    if not os.path.exists(word_file_dir):
        os.makedirs(word_file_dir)

    pdf_to_word(pdf_file, word_file)

    # logging.getLogger().setLevel(logging.ERROR)

    # config_parser = ConfigParser()
    # config_parser.read("config.cfg")
    # config = config_parser["default"]

    # tasks = []
    # with ProcessPoolExecutor(max_workers=int(config["max_worker"])) as executor:
    #     for file in os.listdir(config["pdf_folder"]):
    #         extension_name = os.path.splitext(file)[1]
    #         if extension_name != ".pdf":
    #             continue
    #         file_name = os.path.splitext(file)[0]
    #         pdf_file = config["pdf_folder"] + "/" + file
    #         word_file = config["word_folder"] + "/" + file_name + ".docx"
    #         print("正在处理: ", file)
    #         result = executor.submit(pdf_to_word, pdf_file, word_file)
    #         tasks.append(result)
    # while True:
    #     exit_flag = True
    #     for task in tasks:
    #         if not task.done():
    #             exit_flag = False
    #     if exit_flag:
    #         print("完成")
    #         exit(0)


if __name__ == "__main__":
    main()


# python ./app/pdf.py ./pdf/aaa.pdf '/Users/wuyun/temp/ChatGPT-wechat-bot/word/aaa.docx'
