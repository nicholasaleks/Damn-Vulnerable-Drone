#! /bin/bash

if [ "x${HEADLESS}" == "1" ]; then
    echo -e "INFO\t[QGC] HEADLESS SET. RUNNING IN HEADLESS MODE."
    xvfb-run /home/user/QGroundControl.AppImage
else
    /home/user/QGroundControl.AppImage
fi