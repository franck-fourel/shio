#! /bin/bash

if [ -z "$1" ]; then
    echo "Usage: saveServer machineId"
else
    echo "# Run this job with source (.) to restore the server to its former glory" >restoreServer
    echo 'echo "Creating slots"' >>restoreServer
    bin/shio slots show --fields machine,slot --noHeader -m $1 |sed -e "s~$1~bin/shio servers -m $1 createSlot~g" >>restoreServer
    echo 'echo "Assigning to all the slots"' >>restoreServer
    bin/shio slots show --fields machine,slot,binary,binaryVersion,config,configVersion --noHeader -m $1 |sed -e "s~$1~bin/shio slots assign -m $1 -s~g" >>restoreServer
    echo 'echo "Done."' >>restoreServer
    echo "restoreServer has been created."
fi