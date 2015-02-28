#!/bin/bash

pushd gen
../node_modules/.bin/jison parser.jison
cat yy.js >> parser.js
cp parser.js ../web/js
popd

# # commenting out compilation of _.merge b/c it takes long.
# pushd web/lib
# ../../node_modules/.bin/lodash include=merge
# rm lodash.custom.js
# popd

# cat'ing only b/c otherwise it's easy to mistake the file being edited.
pushd web/js-debug
TARGET=../js/classes-all.js
LAST=render.js
compile () {
    ../../node_modules/.bin/jsx $1 >> $TARGET
}
rm $TARGET
for FILE in $(ls | grep -v $LAST) ; do
    compile $FILE
done
compile $LAST
popd
