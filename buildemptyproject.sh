#!/bin/bash

set -e						  # exit on error

cd `dirname "$0"`
cd src

#build parse.js
node ../lib/r.js -o name=parse out=../empty_project/source/parse.js baseUrl=. optimize=none

#build w.js
node ../lib/r.js -o name=WebBuild.js out=../empty_project/w.js baseUrl=. optimize=none

cp -f -R web/* ../empty_project/source/web

rm -f -R ../empty_project/build
rm -f ../empty_project.zip
cd ../empty_project
zip -r ../empty_project.zip *
