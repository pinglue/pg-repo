#!/bin/bash

echo "Adding package $1 to $2 - with option: $3"

./node_modules/.bin/lerna add $1 --scope=$2 --no-bootstrap $3
