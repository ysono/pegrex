#!/bin/sh

pushd gen
../node_modules/.bin/jison parser.jison
cat yy.js >> parser.js
cp parser.js ../web/js
popd

## commenting out compilation of _.merge b/c it takes long.
# pushd web/lib
# ../../node_modules/.bin/lodash include=merge
# rm lodash.custom.js
# popd
