#!/bin/bash

echo "Linting package $1 - with option: $2 "

node_modules/.bin/lerna exec --stream --no-bail --scope $1 -- node_modules/.bin/eslint "src/**/*.ts" $2