'use strict';

const CJSTransform = require('./cjs-transform');

module.exports = {
  name: 'ember-cli-cjs-transform',

  importTransforms() {
    return {
      cjs(tree) {
        return new CJSTransform(tree);
      },
    };
  },
};
