'use strict';

const Plugin = require('broccoli-plugin');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

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
    this.cacheKey = this.calculateCacheKey();
  }

  build() {
    if (this.hasBuilt) {
      return;
    }

    return this.calculateCacheDirectory()
      .then(cachePath => {
        if (fs.existsSync(cachePath)) {
          return;
        }

        fs.ensureDirSync(cachePath);

        let promises = [];

        for (let relativePath in this.options) {
          const relativePathOptions = this.options[relativePath];

          let promise = this.processFile(relativePath, relativePathOptions.as);
          promises.push(promise);
        }

        return Promise.all(promises);
      })
      .then(() => {
        fs.copySync(this.cachePath, this.outputPath);
        this.hasBuilt = true;
      });
  }

  calculateCacheDirectory() {
    const username = require('username');
    const tmpdir = require('os').tmpdir();

    return username().then(username => {
      let cachePath = path.join(tmpdir, username, 'cjs-transform', this.cacheKey);
      this.cachePath = cachePath;

      return cachePath;
    });
  }

  calculateCacheKey() {
    const hashForDep = require('hash-for-dep');
    const pkgDir = require('pkg-dir');

    let hashes = [
      // ensure the list files and `as` options are part of cache key...
      this.options,
      // ensure this package is part of the cache key...
      hashForDep(path.join(__dirname, '..')),
    ];

    for (let relativePath in this.options) {
      let fullPath = path.join(this.projectRoot, relativePath);
      let packageDir = pkgDir.sync(fullPath);
      let hash = hashForDep(packageDir);

      hashes.push(hash);
    }

    return crypto
      .createHash('md5')
      .update(JSON.stringify(hashes), 'utf8')
      .digest('hex');
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
      file: path.posix.join(this.cachePath, relativePath),
      format: 'amd',
      amd: { id: moduleName },
      exports: 'named',
    };

    return rollup.rollup(inputOptions).then(bundle => bundle.write(outputOptions));
  }
}

module.exports = CJSTransform;
