module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-ts');
  grunt.loadNpmTasks('grunt-typescript');
  grunt.loadNpmTasks('grunt-browserify')

  return grunt.initConfig({
		ts: {
      client: {
        src: ["src/client/**/*.ts"],
        dest: "src/static/bundle.js",
				options: {
					module: 'amd',
					target: 'es5',
					sourceMap: true,
					declaration: true,

					noImplicitAny: true,
					strictNullChecks: true,
					noImplicitAny: true,
					noImplicitThis: true,
					noUnusedLocals: true,
				}
      },
      server: {
        src: ["src/server/**/*.ts"],
        dest: "compiled/",
				options: {
					module: 'commonjs',
					target: 'es5',
					sourceMap: true,
					declaration: true,

					rootDir: 'src/server/',

					noImplicitAny: true,
					strictNullChecks: true,
					noImplicitAny: true,
					noImplicitThis: true,
					noUnusedLocals: true,

					lib: [ "es2016", "dom" ],
				}
      },
    },

    //browserify: {
    //  client: {
    //    src: ["src/client/**/*.ts"],
    //    dest: "src/static/bundle.js",
    //    options: {
    //      plugin: [["tsify", {
    //        noImplicitAny: true,
    //        strictNullChecks: true,
    //        noImplicitAny: true,
    //        noImplicitThis: true,
    //        noUnusedLocals: true,
    //      }]],
    //      browserifyOptions: {
    //        extensions: ['.ts'],
    //      },
    //    },
    //  },
  });
};
