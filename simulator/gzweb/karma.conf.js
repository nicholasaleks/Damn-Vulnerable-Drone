// Karma configuration
// Generated on Sun Aug 27 2017 18:36:29 GMT+0200 (EET)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],


    // list of files / patterns to load in the browser
    files: [
      "gz3d/client/js/include/jquery-1.9.1.js",
      "gz3d/client/js/include/jquery.mobile-1.4.0.min.js",
      'node_modules/jasmine-jquery/lib/jasmine-jquery.js',
      "gz3d/client/js/include/angular.min.js",
      "gz3d/client/js/include/three.js",
      "gz3d/client/js/include/three.compat.js",
      "gz3d/client/js/include/OrbitControls.js",
      "gz3d/client/js/include/Detector.js",
      "gz3d/client/js/include/stats.min.js",
      "gz3d/client/js/include/eventemitter2.js",
      "gz3d/client/js/include/roslib.js",
      "gz3d/client/js/include/ColladaLoader.js",
      "gz3d/client/js/include/OBJLoader.js",
      "gz3d/client/js/include/MTLLoader.js",
      "gz3d/client/js/include/STLLoader.js",
      "gz3d/client/js/include/xml2json.js",
      'gz3d/client/style/gz3d.css',
      "gz3d/test/utils/angular-mocks.min.js",
      'gz3d/test/fixture/*.js',
      'gz3d/build/gz3d.src.js',
      'gz3d/test/fixture/*.html',
      'gz3d/test/*.js',
      {pattern: 'gz3d/test/utils/beer/*', included: false, served: true, watched: false, nocache: true},
      {pattern: 'gz3d/test/utils/walkway_metal_straight/*', included: false, served: true, watched: false, nocache: true},
      {pattern: 'gz3d/test/utils/walkway_metal_straight/meshes/*', included: false, served: true, watched: false, nocache: true},
      {pattern: 'gz3d/test/utils/house_2/*', included: false, served: true, watched: false, nocache: true},
      {pattern: 'gz3d/test/utils/house_2/meshes/*', included: false, served: true, watched: false, nocache: true},
      {pattern: 'gz3d/test/utils/husky/model.sdf', included: false, served: true, watched: false, nocache: true}
    ],


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'gz3d/build/gz3d.src.js': 'coverage'
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress', 'coverage', 'html'],

    // optionally, configure the reporter
    coverageReporter: {
      reporters: [
        {
          type : 'html',
          dir : 'coverage/'
        },
        {
          type : 'lcov'
        },
      ]
    },
    htmlReporter: {
      outputFile: 'test_results/test_results.html'
    },

    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  })
}
