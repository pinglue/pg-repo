
#!/bin/bash

echo "Adding pg base packages to $1"

./node_modules/.bin/lerna add pinglue --scope=$1 --no-bootstrap &&

./node_modules/.bin/lerna add @pinglue/cli --scope=$1 --no-bootstrap &&

./node_modules/.bin/lerna add @pinglue/print --scope=$1 --no-bootstrap &&

./node_modules/.bin/lerna add @pgweb/utils --scope=$1 --no-bootstrap &&

./node_modules/.bin/lerna add @pgweb/server-pl --scope=$1 --no-bootstrap &&

./node_modules/.bin/lerna add @pgweb/request-pl --scope=$1 --no-bootstrap &&

./node_modules/.bin/lerna add @pgweb/locale-pl --scope=$1 --no-bootstrap &&

./node_modules/.bin/lerna add @pgweb/login-pl --scope=$1 --no-bootstrap &&

./node_modules/.bin/lerna add @pgweb/redis-pl --scope=$1 --no-bootstrap &&

./node_modules/.bin/lerna add @pgweb/db-access-pl --scope=$1 --no-bootstrap &&

./node_modules/.bin/lerna add @pgweb/dialog-pl --scope=$1 --no-bootstrap &&

./node_modules/.bin/lerna add @pgweb/form-submit-pl --scope=$1 --no-bootstrap &&

./node_modules/.bin/lerna add @pgweb/session-pl --scope=$1 --no-bootstrap &&

./node_modules/.bin/lerna add @pgweb/user-info-pl --scope=$1 --no-bootstrap &&

./node_modules/.bin/lerna add @pinglue/mongodb-pl --scope=$1 --no-bootstrap &&

node_modules/.bin/lerna bootstrap --hoist
