#!/bin/sh

pushd gen
../node_modules/jison/lib/cli.js parser.jison
popd
