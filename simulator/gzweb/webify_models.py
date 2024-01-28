#!/usr/bin/python

# To be deprecated and replaced by webify_models_v2.py

# A script to update gazebo models to be web-friendly.
# It converts all textures to png format and make sure they are
# stored in the [model_name]/meshes/ directory alongside the
# dae files.

import os
import subprocess
import sys
import shutil

print "**************************************"
print "* 'webify_models.py' is deprecated.  *"
print "* Use 'webify_models_v2.py' instead. *"
print "**************************************"

path = sys.argv[1]

files = os.listdir(path)

find_cmd = ['find', path, '-name','*']
files = subprocess.check_output(find_cmd).split()

for file in files:
  try:
    path, filename = os.path.split(file)
    name, format = filename.split(".")[-2:]

  except:
    continue # not a texture
  try:
    # dest_dir = path.replace('materials/textures', 'meshes')
    dest_dir = path
    dest_path = "%s/%s.png" % (dest_dir, name)
    cmd = None
    if format.lower() in ['tif', 'tga', 'tiff', 'jpeg', 'jpg', 'gif', 'png']:
      if dest_path != file:
        cmd = ['convert', file, dest_path]
        subprocess.check_call(cmd)

      mesh_dest_dir = path.replace('materials/textures', 'meshes')
      if mesh_dest_dir != dest_dir:
        cmd = ['cp', dest_path, mesh_dest_dir]
      # if format.lower() == 'png':
      #  cmd = ['cp', file, mesh_dest_dir]
        print cmd
        subprocess.check_call(cmd)

    if format.lower() in ['dae']:
      sed_cmd = ["sed", "-i", "-e", 's/\.tga/\.png/g', "-e",
          's/\.tiff/\.png/g', "-e", 's/\.tif/\.png/g',
          "-e", 's/\.jpg/\.png/g', "-e", 's/\.jpeg/\.png/g',
          "-e", 's/\.gif/\.png/g', file]
      print sed_cmd
      subprocess.check_call(sed_cmd)
  except Exception, e:
      print "error %s" % e
      raise
