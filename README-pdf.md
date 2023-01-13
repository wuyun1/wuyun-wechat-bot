# pdf2word

~~60 行~~40 行代码实现多进程 PDF 转 Word

> 新版本基于[https://github.com/dothinking/pdf2docx](https://github.com/dothinking/pdf2docx)实现

## 使用方法

- clone 或下载项目到本地

```python
git clone git@github.com:simpleapples/pdf2word.git
```

- 进入项目目录，建立虚拟环境，并安装依赖

```python
cd pdf2word
python3 -m venv venv
source venv/bin/activate
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt
```

- 修改 config.cfg 文件，指定存放 pdf 和 word 文件的文件夹，以及同时工作的进程数
- 执行`python main.py`

## ModuleNotFoundError: No module named '\_tkinter' 报错处理

### macOS 环境

1. 安装 homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

2. 使用 homebrew 安装 tkinter

```bash
brew install python-tk
```

### Linux 环境

以 ubuntu 为例

```bash
sudo apt install python3-tk
```

**欢迎 Star**

## Python 私房菜

![](http://ww1.sinaimg.cn/large/6ae0adaely1foxc0cfkjsj2076076aac.jpg)

## License

采用 MIT 开源许可证
