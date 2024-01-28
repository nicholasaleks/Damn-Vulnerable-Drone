#!/bin/bash

gzwebDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $gzwebDir

gzcoarse=${gzwebDir}/build/tools/gzcoarse

if [ ! -f "$gzcoarse" ]; then
  echo "Error: gzcoarse executable not found, exiting."
  exit
fi

echo "gzcoarse found: $gzcoarse."

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Error: Please specify percentage and the assets path as argument."
  exit
fi


if [ ! -d "$2" ] && [ ! -f "$2" ]; then
  echo "Error: $2 does not exist."
fi

percent="$1";
echo "Simplify to $1%"

assetDir="$2";
echo "Assets directory: $2"

echo "Removing old coarse dae files."

# Delete coarse meshes if exist
find $assetDir -type f -name "*_coarse.dae" -exec rm -f {} \;

# Run gzcoarse on all dae meshes
function coarseAllDae {
  echo -e "\e[32mEntered \e[39m$2\e[32m directory.\e[39m"

  # Coarsen all dae
  for file in `find $assetDir -type f -name "*.dae"`; do
    if [ -f "${file}" ]; then # if not a file, skip
      echo -e "\e[33mCoarsening \e[39m$file"
      $gzcoarse $file $percent
    fi
  done
}

echo "Simplifying meshes"
coarseAllDae $1

echo "Done!"

