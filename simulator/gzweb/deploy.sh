#!/bin/bash

usage()
{
cat << EOF
OPTIONS:
   -h      Show this message
   -m      Build a local model database.
           Option "local" to use only local models.
   -c      Create coarse versions of all models in the local database
   -t      Generate a thumbnail for each model
EOF
exit
}


MODELS=
LOCAL=
COARSE=
THUMBNAIL=
GetOpts()
{
  branch=""
  argv=()
  while [ $# -gt 0 ]
  do
    opt=$1
    shift
    case ${opt} in
        -m)
          MODELS=true
          echo "Build a local model database."
          if [ $# -eq 0 -o "${1:0:1}" = "-" ]
          then
            echo "Download from gazebo_models repository."
          fi
          if [[ "$1" == "local" ]]
          then
            LOCAL=true
            echo "Only local models."
            shift
          fi
          ;;
        -c)
          COARSE=true
          echo "Simplify models on local database."
          ;;
        -t)
          THUMBNAIL=true
          echo "Thumbnails will be generated"
          ;;
        *)
          usage
          argv+=(${opt})
          ;;
    esac
  done
}

GetOpts $*

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR

# Install node modules
npm install

# Assemble javascript files
$DIR/node_modules/.bin/grunt build

# build the c++ server component
rm -rf build
mkdir build
cd build

# Run cmake and check for the exit code
cmake ..

RETVAL=$?
if [ $RETVAL -ne 0 ]; then
  echo There are cmake errors, exiting.
  exit 1
fi

# continue building if cmake is happy
make -j 8

cd ../gzbridge
$DIR/node_modules/.bin/node-gyp rebuild -d

RETVAL=$?
if [ $RETVAL -ne 0 ]; then
  echo There are node-gyp build errors, exiting.
  exit 1
fi

cd $DIR

# build a local model database
if [[ $MODELS ]]
then
  # Temporal directory for the repository
    TMP_DIR=`mktemp -d`
    cd $TMP_DIR

  # If no arg given then download from gazebo_models repo
  if [[ -z $LOCAL ]]
  then
    echo -n "Downloading gazebo_models..."
    git clone https://github.com/osrf/gazebo_models.git

    RETVAL=$?
    if [ $RETVAL -ne 0 ]; then
      echo There are mercurial clone errors, exiting.
      exit 1
    fi

    echo "Download complete"
    cd gazebo_models
    mkdir build
    cd build
    echo -n "Installing gazebo_models..."
    cmake .. -DCMAKE_INSTALL_PREFIX=$DIR/http/client && make install > /dev/null 2>&1

    RETVAL=$?
    if [ $RETVAL -ne 0 ]; then
      echo There are build errors, exiting.
      exit 1
    fi

    echo "Install complete"

    # Remove temp dir
    rm -rf $TMP_DIR
    rm -rf $DIR/http/client/assets
    mv $DIR/http/client/models $DIR/http/client/assets
  fi

  cd $DIR

  echo "Gather all models on the local machine"

  mkdir -p $DIR/http/client/assets
  ./get_local_models.py $DIR/http/client/assets
  ./webify_models_v2.py $DIR/http/client/assets

else
  mkdir -p $DIR/http/client/assets
  echo "Not cloning the model repo"
fi

if [[ $THUMBNAIL ]]
then
  echo "Generating a thumbnail for each model. Make sure gazebo is not running"
  ./tools/gzthumbnails.sh
fi

# build a local model database
if [[ $COARSE ]]
then
  ./coarse_meshes.sh 50 http/client/assets/
fi

echo "Done"

