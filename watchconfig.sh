#! /bin/bash

# This file tracks changes in shio configurations

# get to the correct folder
HOME=/home/tidepool-deploy/shio
cd $HOME
FOLDER=/home/tidepool-deploy/shio/shiostatus

# make sure we have a shiostatus folder
if [ ! -d shiostatus ]; then
    mkdir shiostatus
fi

$HOME/bin/shio slots show >$FOLDER/latest.shiostatus

shasum --check $FOLDER/latest.checksum --status
if [ $? -eq 0 ]; then
    # we're good
    echo "not updating"
else
    echo "updating!"
    shasum $FOLDER/latest.shiostatus >$FOLDER/latest.checksum
    $HOME/saveServers.sh all $FOLDER/latest.restore
    ts=$(date "+%Y-%m-%d-%H-%M-%S")
    cp $FOLDER/latest.shiostatus $FOLDER/$ts.shiostatus
    cp $FOLDER/latest.restore $FOLDER/$ts.restore
fi

