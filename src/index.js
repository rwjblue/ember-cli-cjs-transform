'use strict';

const CJSTransform = require('./cjs-transform');

module.exports = {
  name: 'ember-cli-cjs-transform',

  importTransforms() {
    return {
      cjs: {
        transform(tree, options) {
          return new CJSTransform(tree, options);
        },
        processOptions(assetPath, entry, options) {
          if (!entry.as) {
            throw new Error(
              `while importing ${
                assetPath
              }: cjs transformation requires an \`as\` argument that specifies the desired module name`
            );
          }

          // If the import is specified to be a different name we must break because of the broccoli rewrite behavior.
          if (
            Object.keys(options).indexOf(assetPath) !== -1 &&
            options[assetPath].as !== entry.as
          ) {
            throw new Error(
              `Highlander error while importing ${
                assetPath
              }. You may not import an AMD transformed asset at different module names.`
            );
          }

          options[assetPath] = {
            as: entry.as,
          };

          return options;
        },
      },
    };
  },
};
