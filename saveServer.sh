#! /bin/bash

saveOneServer() {
    echo "# --- Setup for server $1 ---" >>$2
    echo 'echo "Creating slots"' >>$2
    bin/shio slots show --fields machine,slot --noHeader -m $1 |sed -e "s~$1~bin/shio servers -m $1 createSlot~g" >>$2
    echo 'echo "Assigning to all the slots"' >>$2
    bin/shio slots show --fields machine,slot,binary,binaryVersion,config,configVersion --noHeader -m $1 |sed -e "s~$1~bin/shio slots assign -m $1 -s~g" >>$2
    echo 'echo "Done."' >>$2
    echo '# ---' >>$2
    echo >>$2
}

outputfile="restoreScript"
if [ -n "$2" ]; then
    outputfile=$2
fi

if [ -z "$1" ]; then
    echo "Usage: saveServer machineId [filename]"
    echo "  or"
    echo "saveServer all [filename]"
elif [ "$1" == "all" ]; then
    echo "echo WARNING -- RUNNING THIS JOB IS PROBABLY NOT WHAT YOU WANT TO DO!" >$outputfile
    echo "echo So we are going to make you edit it to prove you really want to." >>$outputfile
    echo "if [ YES == NO ]; then" >>$outputfile
    echo >>$2
    for machine in $(bin/shio servers show --fields machine --noHeader); do
        saveOneServer $machine $outputfile
    done
    echo "fi" >>$outputfile
    echo "$outputfile has been created -- BE CAREFUL."
else
    echo "# Run this job with source (.) to restore $1 to its former glory" >$outputfile
    saveOneServer $1 $outputfile
    echo "$outputfile has been created."
fi
