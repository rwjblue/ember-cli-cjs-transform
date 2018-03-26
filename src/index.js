'use strict';

module.exports = {
  name: 'ember-cli-cjs-transform',

  importTransforms() {
    const BroccoliDebug = require('broccoli-debug');
    const CJSTransform = require('./cjs-transform');

    let project = this.project;
    let debugTree = BroccoliDebug.buildDebugCallback('ember-cli-cjs-transform');

    let transforms = this.eachAddonInvoke('importTransforms');
    
    return Object.assign.apply(Object, [{
      cjs: {
        transform(tree, options) {
          let input = debugTree(tree, 'input');

          let processed = new CJSTransform(input, project.root, options);

          return debugTree(processed, 'output');
        },

        processOptions(assetPath, entry, options) {
          if (!entry.as) {
            throw new Error(
              `while importing ${assetPath}: cjs transformation requires an \`as\` argument that specifies the desired module name`
            );
          }

          // If the import is specified to be a different name we must break because of the broccoli rewrite behavior.
          if (
            Object.keys(options).indexOf(assetPath) !== -1 &&
            options[assetPath].as !== entry.as
          ) {
            throw new Error(
              `Highlander error while importing ${assetPath}. You may not import an AMD transformed asset at different module names.`
            );
          }

          options[assetPath] = {
            as: entry.as,
          };

          return options;
        },
      },
    }].concat(transforms));
  },
};
