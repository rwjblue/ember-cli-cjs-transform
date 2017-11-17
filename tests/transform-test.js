'use strict';

const CJSTransform = require('../src/cjs-transform');

const describe = QUnit.module;
const it = QUnit.test;

describe('cjs-transform-wrapper', function() {
  function wrapAndExecute(name, input) {
    let wrappedContents = CJSTransform.wrap(name, input);
    let result = new Function(`
      let result = {};
      function define(moduleName, deps, callback) {
        result.name = moduleName;
        result.deps = deps;
        result.callback = callback;
      }

      ${wrappedContents};

      return result;
    `)();

    result.output = wrappedContents;

    return result;
  }

  it('emits an AMD module', function(assert) {
    let result = wrapAndExecute('foo', `module.exports = "adsf";`);

    assert.equal(result.name, 'foo', 'name matches');
    assert.deepEqual(result.deps, ['require'], 'deps match');
  });

  it('callback returns module.exports value', function(assert) {
    let result = wrapAndExecute('foo', `module.exports = "adsf";`);

    assert.equal(result.callback(), 'adsf', 'callback works');
  });

  it('can use require', function(assert) {
    assert.expect(2);

    let result = wrapAndExecute('foo', `module.exports = require('bar');`);

    function require(module) {
      assert.equal(module, 'bar', 'correct module was required');
      return 'bar required';
    }

    assert.equal(result.callback(require), 'bar required', 'callback works');
  });
});
