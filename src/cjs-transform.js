'use strict';

const Filter = require('broccoli-persistent-filter');

class CJSTransform extends Filter {
  static wrap(moduleName, contents) {
    return `
;define('${moduleName}', ['require'], function(require) {
  var module = { };

  ${contents}

  return module.exports;
});
`;
  }

  constructor(input, options) {
    super(input, {
      annotation: 'CJS Transform',
    });

    this.extensions = ['.js'];
    this.targetExtension = ['.js'];
    this.options = options;
  }

  processString(content, relativePath) {
    const name = this.options[relativePath].as;
    if (name) {
      return this.constructor.wrap(name, content);
    } else {
      return content;
    }
  }
}

module.exports = CJSTransform;
