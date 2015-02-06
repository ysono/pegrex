#!/bin/sh

node gen/spec/escapedInteger-spec.js | grep -v "^true"
node gen/spec/escapedInteger-parser.js | grep -v "^true"
