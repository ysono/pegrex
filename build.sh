#!/bin/sh

pushd gen
../node_modules/.bin/jison parser.jison
cat yy.js >> parser.js
cp parser.js ../web/js
popd
