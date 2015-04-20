#! /bin/bash

# This file tracks changes in shio configurations

# make sure we have a shiostatus folder
if [ ! -d shiostatus ]; then
    mkdir shiostatus
fi

tempfile=$(mktemp /tmp/shiostatusXXXXXX)
./bin/shio slots show >$tempfile

cks=$(md5 -q $tempfile)

if [ -e shiostatus/latest.checksum -a "$cks" == "$(cat shiostatus/latest.checksum)" ]; then
    # we're good
    echo "not updating"
    rm $tempfile
else
    echo "updating!"
    echo $cks>shiostatus/latest.checksum
    ts=$(date "+%Y-%m-%d-%H-%M-%S")
    cp $tempfile shiostatus/latest.shiostatus
    mv $tempfile shiostatus/$ts.shiostatus
    ./saveServers.sh all shiostatus/$ts.restore
fi

