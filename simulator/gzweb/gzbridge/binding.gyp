{
  "targets": [
    {
      "target_name": "gzbridge",
      "sources": [ "GZNode.cc", "GZNode.hh",
        "GazeboInterface.cc", "GazeboInterface.hh",
        "pb2json.cc", "pb2json.hh",
        "ConfigLoader.cc", "ConfigLoader.hh",
        "OgreMaterialParser.cc", "OgreMaterialParser.hh"],
      'cflags_cc!': [ '-fno-rtti', '-fno-exceptions' ],
      'cflags!': [ '-fno-exceptions' ],
      "conditions": [
        ['OS=="linux"', {
          'cflags': [
            '<!@(pkg-config --cflags gazebo jansson protobuf)'
          ],
          'cflags_cc': [ '-fno-rtti', '-fno-exceptions', '-std=c++17' ],
          'ldflags': [
            '<!@(pkg-config --libs-only-L --libs-only-other gazebo jansson protobuf)'
          ],
          'libraries': [
            '<!@(pkg-config --libs-only-l gazebo jansson protobuf)'
          ]
        }],
        ['OS=="mac"', {
          'libraries': [
            '<!@(pkg-config --libs-only-l gazebo jansson protobuf)'
          ],
          'xcode_settings' : {
            'GCC_ENABLE_CPP_RTTI': 'YES',
            'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
            'OTHER_CFLAGS': [
              '<!@(pkg-config --cflags gazebo jansson protobuf)'
            ],
            'OTHER_CPLUSPLUSFLAGS': [
              '<!@(pkg-config --cflags gazebo jansson protobuf)'
            ],
            'OTHER_LDFLAGS': [
              '<!@(pkg-config --libs-only-L --libs-only-other  gazebo jansson protobuf)'
            ]
          }
        }]
      ]
    }
  ]
}
