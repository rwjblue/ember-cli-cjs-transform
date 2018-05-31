'use strict';

const fs = require('fs');
const path = require('path');
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
              'package.json': '{ "name": "foo", "version": "1.0.0" }',
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
              'package.json': '{ "name": "foo", "version": "1.0.0" }',
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

    it(
      'invalidates cache when restarted and contents differ',
      co.wrap(function*(assert) {
        let commonContents = {
          node_modules: {
            foo: {
              'package.json': '{ "name": "foo", "version": "1.0.0" }',
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

        // cleanup initial builder
        yield output.dispose();

        // write new contents
        commonContents = {
          node_modules: {
            foo: {
              'package.json': '{ "name": "foo", "version": "2.0.0" }',
              'index.js': 'module.exports = "huzzah";',
            },
          },
        };
        projectRoot.write(commonContents);
        input.write(commonContents);

        // reset the hash-for-dep cache; without this we do _not_ recalculate
        // the hashes (hash-for-dep itself caches the hashes for the life of
        // the process)
        require('hash-for-dep')._resetCache();

        // setup a new builder
        subject = new CJSTransform(input.path(), projectRoot.path(), {
          'node_modules/foo/index.js': { as: 'bar' },
        });

        output = createBuilder(subject);
        yield output.build();

        results = evaluateModules(output.path('node_modules/foo/index.js'));
        assert.equal(results.name, 'bar');
        assert.deepEqual(results.exports, { default: 'huzzah' });
      })
    );

    it(
      'finds node_modules using the same algorithm as `require`',
      co.wrap(function*(assert) {
        let commonContents = {
          node_modules: {
            foo: {
              'package.json': '{ "name": "foo", "version": "1.0.0" }',
              'index.js': 'module.exports = "derp";',
            },
          },
          project: {
            node_modules: {
              baz: {
                'package.json': '{ "name": "baz", "version": "1.0.0" }',
                'index.js': 'module.exports = "moop";',
              },
            },
          },
        };
        projectRoot.write(commonContents);
        input.write(commonContents);

        // Project directory has a sibling node_modules directory, like in a
        // yarn workspace.
        let projectPath = path.join(projectRoot.path(), 'project');
        let subject = new CJSTransform(input.path(), projectPath, {
          'node_modules/foo/index.js': { as: 'bar' },
          'node_modules/baz/index.js': { as: 'quux' },
        });

        output = createBuilder(subject);

        yield output.build();

        let results = evaluateModules(output.path('node_modules/foo/index.js'));
        assert.equal(results.name, 'bar');
        assert.deepEqual(results.exports, { default: 'derp' });

        results = evaluateModules(output.path('node_modules/baz/index.js'));
        assert.equal(results.name, 'quux');
        assert.deepEqual(results.exports, { default: 'moop' });
      })
    );
  });
});
