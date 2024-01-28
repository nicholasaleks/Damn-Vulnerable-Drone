cmake_minimum_required(VERSION 2.8 FATAL_ERROR)
enable_testing()

project (gzweb)
include(ExternalProject)

set (GZWEB_MAJOR_VERSION 2)
set (GZWEB_MINOR_VERSION 0)
set (GZWEB_PATCH_VERSION 0)
set (GZWEB_VERSION ${GZWEB_MAJOR_VERSION}.${GZWEB_MINOR_VERSION})
set (GZWEB_VERSION_FULL ${GZWEB_MAJOR_VERSION}.${GZWEB_MINOR_VERSION}.${GZWEB_PATCH_VERSION})
message (STATUS "${PROJECT_NAME} version ${GZWEB_VERSION_FULL}")

set (gzweb_cmake_dir ${PROJECT_SOURCE_DIR}/cmake CACHE PATH "Location of CMake scripts")

# Packaging configuration
set (CPACK_PACKAGE_VERSION "${GZWEB_VERSION_FULL}")
set (CPACK_PACKAGE_VERSION_MAJOR "${GZWEB_MAJOR_VERSION}")
set (CPACK_PACKAGE_VERSION_MINOR "${GZWEB_MINOR_VERSION}")
set (CPACK_PACKAGE_VERSION_PATCH "${GZWEB_PATCH_VERSION}")
list (APPEND CPACK_SOURCE_GENERATOR "TBZ2")
list (APPEND CPACK_SOURCE_IGNORE_FILES ";TODO;/.hg/;.hgignore;.swp$;/build/")
set (CPACK_SOURCE_PACKAGE_FILE_NAME "@PROJECT_NAME@-@GZWEB_VERSION_FULL@")
include (CPack)


#####################################
# Set the default build type
if (NOT CMAKE_BUILD_TYPE)
  set (CMAKE_BUILD_TYPE "Release" CACHE STRING
    "Choose the type of build, options are: Debug Release RelWithDebInfo" FORCE)
  message(STATUS "Build type not selected: Release selected by default")
endif (NOT CMAKE_BUILD_TYPE)

# find gazebo
include (FindPkgConfig)
if (PKG_CONFIG_FOUND)
  find_package(gazebo REQUIRED)
  pkg_check_modules(JANSSON jansson REQUIRED)

  # Find GNU Triangulation Surface Library
  pkg_check_modules(GTS gts)
  if (GTS_FOUND)
    set (HAVE_GTS TRUE)
  else ()
    set (HAVE_GTS FALSE)
    message (WARNING "GNU Triangulation Surface library not found,
        gzcoarse/mesh simplification functionality will be disabled.")
  endif ()
else()
  message(FATAL_ERROR "pkg-config is required; please install it")
endif()

include(FindBoost)
find_package(Boost ${MIN_BOOST_VERSION} REQUIRED system filesystem regex thread)
find_package(Protobuf REQUIRED)

# Find tinyxml. Only debian distributions package tinyxml with a pkg-config
find_path (tinyxml_include_dir tinyxml.h ${tinyxml_include_dirs} ENV CPATH)
if (NOT tinyxml_include_dir)
  message (STATUS "Looking for tinyxml.h - not found")
  message(FATAL_ERROR "Missing: tinyxml")
else ()
  message (STATUS "Looking for tinyxml.h - found")
  set (tinyxml_include_dirs ${tinyxml_include_dir} CACHE STRING
    "tinyxml include paths. Use this to override automatic detection.")
  set (tinyxml_libraries "tinyxml" CACHE INTERNAL "tinyxml libraries")
endif ()

find_program(ImageMagick convert)
if ("${ImageMagick}" STREQUAL "ImageMagick-NOTFOUND")
  message(FATAL_ERROR "imagemagick not found")
endif()

add_subdirectory(gz3d)
add_subdirectory(tools)

########### Add uninstall target ###############
configure_file(
  "${CMAKE_CURRENT_SOURCE_DIR}/cmake/cmake_uninstall.cmake.in"
  "${CMAKE_CURRENT_BINARY_DIR}/cmake/cmake_uninstall.cmake"
  IMMEDIATE @ONLY)
add_custom_target(uninstall
  "${CMAKE_COMMAND}" -P "${CMAKE_CURRENT_BINARY_DIR}/cmake/cmake_uninstall.cmake")
