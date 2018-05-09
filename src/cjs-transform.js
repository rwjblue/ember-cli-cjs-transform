'use strict';

const Plugin = require('broccoli-plugin');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const resolveSync = require('resolve').sync;

const NODE_MODULES = 'node_modules/';

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
  /**
   * @param {string} input - absolute path to source directory
   * @param {string} projectRoot - absolute path to project root. Used as the reference directory to find NPM packages via node's `require` algorithm
   * @param {Object} options - map of relative file paths to rollup options, i.e. { "node_modules/foo/bar.js": { as: 'foo' } }
   */
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
      let fullPath = resolveSync(relativePath.slice(NODE_MODULES.length), {
        basedir: this.projectRoot,
      });
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

    if (!relativePath.startsWith(NODE_MODULES)) {
      throw new Error(`The "cjs" transform works only with NPM packages.
You tried to use it with "${relativePath}". Make sure your imported file path
begins with "node_modules/".`);
    }

    const fullPath = resolveSync(relativePath.slice(NODE_MODULES.length), {
      basedir: this.projectRoot,
    });

    let inputOptions = {
      input: fullPath,
      plugins: [
        resolve({
          browser: true,
        }),
        commonjs(),
      ],
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
