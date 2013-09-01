#!/bin/bash

set -e						  # exit on error

cd `dirname "$0"`

mkdir output
cp -R source/* output

node r.js -lib w.js -source source -dest output -v log -overwrite -exclude index.html

cd output
node ../r.js -o name=index out=index.js baseUrl=. optimize=uglify

cd ..
mkdir -p build
mkdir -p build/js

cp output/index.html build/index.html
cp output/index.js build/index.js
cp output/js/require.js build/js/require.js

rm -f -R output
