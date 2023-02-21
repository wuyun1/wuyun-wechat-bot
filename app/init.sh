#!/bin/bash

cd node_modules/@waynew/boa

# rm -rf Miniconda3-*

# rm -rf .miniconda && CONDA_PACKAGE_NAME=Miniconda3-py39_4.9.2 node ./tools/install-python.js
# rm -rf .miniconda && node ./tools/install-python.js

node ./tools/install-python.js

cd ../../../


./node_modules/@waynew/boa/.miniconda/bin/python --version

if [[ ! -d transformers ]] then git clone --depth=1 https://github.com/huggingface/transformers.git; fi

./node_modules/@waynew/boa/.miniconda/bin/pip install ./transformers

./node_modules/@waynew/boa/.miniconda/bin/pip install -r requirements.txt

source ./node_modules/@waynew/boa/.miniconda/bin/activate

./node_modules/@waynew/boa/.miniconda/bin/python ./app/answer.py

npx ts-node --esm --preferTsExts --experimentalSpecifierResolution node ./app/test-boa.ts
