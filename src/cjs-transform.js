'use strict';

const Plugin = require('broccoli-plugin');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

function ensureCachePopulated(cacheKey, buildFunction) {
  const username = require('username');
  const tmpdir = require('os').tmpdir();

  let cachePath;

  return username()
    .then(username => {
      cachePath = path.join(tmpdir, username, cacheKey);

      if (fs.existsSync(cachePath)) {
        // cache already exists, do nothing...
        return;
      }

      fs.ensureDirSync(cachePath);

      return buildFunction(cachePath);
    })
    .then(() => cachePath);
}

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
    this.cacheKey = path.join('cjs-transform', this.calculateCacheKey());
  }

  build() {
    if (this.hasBuilt) {
      return;
    }

    return ensureCachePopulated(this.cacheKey, cachePath => {
      let promises = [];

      for (let relativePath in this.options) {
        const relativePathOptions = this.options[relativePath];

        let promise = this.processFile(cachePath, relativePath, relativePathOptions.as);
        promises.push(promise);
      }

      return Promise.all(promises);
    }).then(cachePath => {
      fs.copySync(cachePath, this.outputPath);
      this.hasBuilt = true;
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

  processFile(cachePath, relativePath, moduleName) {
    const rollup = require('rollup');
    const resolve = require('rollup-plugin-node-resolve');
    const commonjs = require('rollup-plugin-commonjs');

    let plugins = this.options[relativePath].plugins || [];

    let inputOptions = {
      input: path.posix.join(this.projectRoot, relativePath),
      plugins: [
        resolve({
          browser: true,
          customResolveOptions: {
            moduleDirectory: path.join(this.projectRoot, 'node_modules'),
          },
        }),
        commonjs(),
      ].concat(plugins),
    };

    let outputOptions = {
      file: path.posix.join(cachePath, relativePath),
      format: 'amd',
      amd: { id: moduleName },
      exports: 'named',
    };

    return rollup.rollup(inputOptions).then(bundle => bundle.write(outputOptions));
  }
}

module.exports = CJSTransform;
