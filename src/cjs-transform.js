'use strict';

const Plugin = require('broccoli-plugin');
const path = require('path');

class CJSTransform extends Plugin {
  constructor(input, projectRoot, options) {
    super([input], {
      name: 'CJSTransform',
      annotation: 'CJS Transform',
      persistentOutput: true,
    });

    this.projectRoot = projectRoot;
    this.options = options;
    this.hasBuilt = false;
  }

  build() {
    if (this.hasBuilt) {
      return;
    }

    let promises = [];

    for (let relativePath in this.options) {
      const relativePathOptions = this.options[relativePath];

      let promise = this.processFile(relativePath, relativePathOptions.as);
      promises.push(promise);
    }

    return Promise.all(promises).then(() => (this.hasBuilt = true));
  }

  processFile(relativePath, moduleName) {
    const rollup = require('rollup');
    const resolve = require('rollup-plugin-node-resolve');
    const commonjs = require('rollup-plugin-commonjs');

    let inputOptions = {
      input: path.posix.join(this.projectRoot, relativePath),
      plugins: [
        resolve({
          customResolveOptions: {
            moduleDirectory: path.join(this.projectRoot, 'node_modules'),
          },
        }),
        commonjs(),
      ],
    };

    let outputOptions = {
      file: path.posix.join(this.outputPath, relativePath),
      format: 'amd',
      amd: { id: moduleName },
    };

    return rollup.rollup(inputOptions).then(bundle => bundle.write(outputOptions));
  }
}

module.exports = CJSTransform;
