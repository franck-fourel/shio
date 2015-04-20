#! /bin/bash

# This file tracks changes in shio configurations

# make sure we have a shiostatus folder
if [ ! -d shiostatus ]; then
    mkdir shiostatus
fi

./bin/shio slots show >shiostatus/latest.shiostatus

if $(shasum --check shiostatus/latest.checksum --status); then
    # we're good
    echo "not updating"
else
    echo "updating!"
    shasum shiostatus/latest.shiostatus >shiostatus/latest.checksum
    ./saveServers.sh all shiostatus/latest.restore
    ts=$(date "+%Y-%m-%d-%H-%M-%S")
    cp shiostatus/latest.shiostatus shiostatus/$ts.shiostatus
    cp shiostatus/latest.restore shiostatus/$ts.restore
fi
