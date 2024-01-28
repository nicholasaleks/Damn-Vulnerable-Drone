include_directories(
  include_directories(${GAZEBO_INCLUDE_DIRS})
)

link_directories(${GAZEBO_LIBRARY_DIRS})

set (sources
  pb2json.cc
  GazeboInterface.cc
  pb2json.cc
)

set (headers
  pb2json.hh
  GazeboInterface.hh
)
