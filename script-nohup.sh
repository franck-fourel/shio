#! /bin/bash -eu

nohup npm run-script $1 2>&1 > log.out &
