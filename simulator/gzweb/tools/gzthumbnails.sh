#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ASSETS="$DIR/../http/client/assets"

for dir in $ASSETS/*/
do
  dir=${dir%*/}
  echo "Creating thumbnail for ${dir##*/}"
  rm -rf $ASSETS/${dir##*/}/thumbnails
  if [[ -f $ASSETS/${dir##*/}/model.sdf ]]; then
	  # generate thumbnails with green bg
    gzserver -s libModelPropShop.so $DIR/green.world --propshop-save "$ASSETS/${dir##*/}/thumbnails" --propshop-model "$ASSETS/${dir##*/}/model.sdf"
	  # make green bg transparent
	  convert $ASSETS/${dir##*/}/thumbnails/1.png -fuzz 30% -transparent '#00ff00' $ASSETS/${dir##*/}/thumbnails/0.png
    # crop transparent ends
    convert $ASSETS/${dir##*/}/thumbnails/0.png -trim $ASSETS/${dir##*/}/thumbnails/0.png
    # add shadow
    convert -background none -fill black \
                $ASSETS/${dir##*/}/thumbnails/0.png \
            \( +clone -background black  -shadow 100x10+0+0 \) +swap \
            -background none   -layers merge +repage  $ASSETS/${dir##*/}/thumbnails/0.png
    # remove extra files
    rm $ASSETS/${dir##*/}/thumbnails/1.png
    rm $ASSETS/${dir##*/}/thumbnails/2.png
    rm $ASSETS/${dir##*/}/thumbnails/3.png
    rm $ASSETS/${dir##*/}/thumbnails/4.png
    rm $ASSETS/${dir##*/}/thumbnails/5.png
  fi
done
