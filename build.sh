#!/bin/sh

pushd gen
../node_modules/jison/lib/cli.js parser.jison
cp parser.js ../web
popd
