'use strict';

const fs = require('fs');
const co = require('co');
const BroccoliTestHelper = require('broccoli-test-helper');
const createBuilder = BroccoliTestHelper.createBuilder;
const createTempDir = BroccoliTestHelper.createTempDir;

const CJSTransform = require('../src/cjs-transform');

const describe = QUnit.module;
const it = QUnit.test;

describe('ember-cli-cjs-transform', function() {
  function evaluateModules(filePath) {
    let contents = fs.readFileSync(filePath, { encoding: 'utf-8' });

    return new Function(`
      'use strict';
      let exports = {};
      let result = { exports };
      function define(moduleName, deps, callback) {
        result.name = moduleName;

        if (callback === undefined) {
          result.deps = [];
          result.callback = deps;
        } else {
          result.deps = deps;
          result.callback = callback;
        }

        callback(exports);
      }

      ${contents};

      return result;
    `)();
  }

  describe('broccoli tree', function(hooks) {
    let input, projectRoot, output;

    hooks.beforeEach(
      co.wrap(function*() {
        input = yield createTempDir();
        projectRoot = yield createTempDir();
      })
    );

    hooks.afterEach(function() {
      return Promise.all([
        input && input.dispose(),
        output && output.dispose(),
        projectRoot && projectRoot.dispose(),
      ]);
    });

    it(
      'basic functionality works',
      co.wrap(function*(assert) {
        let commonContents = {
          node_modules: {
            foo: {
              'index.js': 'module.exports = "derp";',
            },
          },
        };
        projectRoot.write(commonContents);
        input.write(commonContents);

        let subject = new CJSTransform(input.path(), projectRoot.path(), {
          'node_modules/foo/index.js': { as: 'bar' },
        });

        output = createBuilder(subject);

        yield output.build();

        let results = evaluateModules(output.path('node_modules/foo/index.js'));
        assert.equal(results.name, 'bar');
        assert.deepEqual(results.exports, { default: 'derp' });

        // UPDATE
        commonContents = {
          node_modules: {
            foo: {
              'index.js': 'module.exports = "lol should not update";',
            },
          },
        };
        projectRoot.write(commonContents);
        input.write(commonContents);

        yield output.build();

        assert.deepEqual(output.changes(), {});

        // NOOP
        yield output.build();

        assert.deepEqual(output.changes(), {});
      })
    );

    it(
      'can rollup CJS requires',
      co.wrap(function*(assert) {
        let commonContents = {
          node_modules: {
            foo: {
              'index.js': 'module.exports = { bar: require("./bar"), foo: require("./foo") };',
            },
          },
        };
        projectRoot.write(commonContents);
        input.write(commonContents);

        projectRoot.write({
          node_modules: {
            foo: {
              'foo.js': 'module.exports = "from foo";',
              'bar.js': 'module.exports = "from bar";',
            },
          },
        });

        let subject = new CJSTransform(input.path(), projectRoot.path(), {
          'node_modules/foo/index.js': { as: 'bar' },
        });

        output = createBuilder(subject);

        yield output.build();

        // INITIAL
        let results = evaluateModules(output.path('node_modules/foo/index.js'));
        assert.equal(results.name, 'bar');
        assert.deepEqual(results.exports, {
          default: {
            bar: 'from bar',
            foo: 'from foo',
          },
          bar: 'from bar',
          foo: 'from foo',
        });

        // UPDATE
        commonContents = {
          node_modules: {
            foo: {
              'index.js': 'module.exports = "haha you screwed";',
            },
          },
        };
        projectRoot.write(commonContents);
        input.write(commonContents);

        yield output.build();

        assert.deepEqual(output.changes(), {});

        // NOOP
        yield output.build();

        assert.deepEqual(output.changes(), {});
      })
    );
  });
});
