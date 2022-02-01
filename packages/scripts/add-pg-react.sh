#!/bin/bash

echo "Adding pg react packages to $1"

./node_modules/.bin/lerna add @pgweb/react-utils --scope=$1 --no-bootstrap &&
./node_modules/.bin/lerna add @pgweb/locale-pl-react --scope=$1 --no-bootstrap &&
node_modules/.bin/lerna bootstrap --hoist