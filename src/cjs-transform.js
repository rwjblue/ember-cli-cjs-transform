'use strict';

const Filter = require('broccoli-persistent-filter');

class CJSTransform extends Filter {
  constructor(input) {
    super(input, {
      annotation: 'CJS Transform',
    });
  }
}

module.exports = CJSTransform;
