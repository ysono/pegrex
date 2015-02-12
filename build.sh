#!/bin/sh

pushd gen
../node_modules/jison/lib/cli.js parser.jison
cat yy.js >> parser.js
cp parser.js ../web/js
popd
