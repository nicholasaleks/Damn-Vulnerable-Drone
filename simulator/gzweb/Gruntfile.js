module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      // All gz*.js files
      build_src: {
        src  : ['gz3d/src/*.js'],
        dest : 'gz3d/build/gz3d.src.js'
      },
      // * All src except for GUI-related
      // * All needed dependencies
      build_gz3d: {
        src  : ['gz3d/client/js/include/three.js',
                'gz3d/client/js/include/three.compat.js',
                'gz3d/client/js/include/*.js',
                '!gz3d/client/js/include/three.min.js',
                '!gz3d/client/js/include/stats.min.js',
                '!gz3d/client/js/include/roslib.min.js',
                '!gz3d/client/js/include/jquery-1.9.1.js',
                '!gz3d/client/js/include/jquery.mobile-1.4.0.min.js',
                '!gz3d/client/js/include/angular.min.js',
                '!gz3d/client/js/include/',
                'gz3d/src/gz*.js',
                '!gz3d/src/gzgui.js',
                '!gz3d/src/gzlogplay.js',
                '!gz3d/src/gzradialmenu.js',
        ],
        dest : 'gz3d/build/gz3d.js'
      },
      // * All src including GUI
      // * All needed dependencies
      build_gui: {
        src  : ['gz3d/client/js/include/three.js',
                'gz3d/client/js/include/three.compat.js',
                'gz3d/client/js/include/*.js',
                '!gz3d/client/js/include/three.min.js',
                '!gz3d/client/js/include/stats.min.js',
                '!gz3d/client/js/include/roslib.min.js',
                '!gz3d/client/js/include/',
                'gz3d/src/gz*.js',
        ],
        dest : 'gz3d/build/gz3d.gui.js'
      }
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      files: [
        'Gruntfile.js',
        'gz3d/build/gz3d.src.js'
      ]
    },
    uglify: {
      options: {
        report: 'min'
      },
      build_src: {
        src: 'gz3d/build/gz3d.js',
        dest: 'gz3d/build/gz3d.min.js'
      },
      build_gz3d: {
        src: 'gz3d/build/gz3d.js',
        dest: 'gz3d/build/gz3d.min.js'
      },
      build_gui: {
        src: 'gz3d/build/gz3d.gui.js',
        dest: 'gz3d/build/gz3d.gui.min.js'
      }
    },
    watch: {
      dev: {
        options: {
          interrupt: true
        },
        files: [
          'gz3d/src/*.js',
          'gz3d/src/**/*.js'
        ],
        tasks: ['concat']
      },
      build_and_watch: {
        options: {
          interrupt: true
        },
        files: [
          'Gruntfile.js',
          '.jshintrc',
          'gz3d/src/*.js',
          'gz3d/src/**/*.js'
        ],
        tasks: ['build']
      }
    },
    clean: {
      options: {
        force: true
      },
      doc: ['doc']
    },
    jsdoc: {
      jsdoc: './node_modules/.bin/jsdoc',
      doc: {
        src: [
          'gz3d/src/*.js',
          'gz3d/src/**/*.js'
        ],
        options: {
          destination: 'doc'
        }
      }
    },
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-jsdoc');

  grunt.registerTask('dev', ['concat', 'watch']);
  grunt.registerTask('build', ['concat', 'jshint', 'uglify']);
  grunt.registerTask('build_and_watch', ['watch']);
  grunt.registerTask('doc', ['clean', 'jsdoc']);
};
