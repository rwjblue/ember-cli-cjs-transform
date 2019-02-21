'use strict';

const Plugin = require('broccoli-plugin');
const path = require('path');
const resolveSync = require('resolve').sync;
const Cache = require('sync-disk-cache');
const crypto = require('crypto');
const fs = require('fs-extra');

const NODE_MODULES = 'node_modules/';

module.exports = class CJSTransform extends Plugin {
  constructor(input, parentRoot, options) {
    super([input], {
      name: 'CJSTransform',
      annotation: 'CJS Transform',
      persistentOutput: true,
    });

    this.parentRoot = parentRoot;
    this.options = options;
    this.hasBuilt = false;
    this.cache = new Cache(this.calculateCacheKey());
  }

  build() {
    if (this.hasBuilt) {
      return;
    }

    let work = [];

    for (let relativePath in this.options) {
      const relativePathOptions = this.options[relativePath];

      work.push(this.processFile(relativePath, relativePathOptions.as));
    }

    return Promise.all(work)
      .then(() => (this.hasBuilt = true))
      .catch(e => {
        // if something goes wrong, we should purge our output so we can potentially recover on rebuild
        fs.removeSync(this.outputPath);
        throw e;
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
        basedir: this.parentRoot,
      });
      let packageDir = pkgDir.sync(fullPath);
      let hash = hashForDep(packageDir);

      hashes.push(hash);
    }

    return crypto
      .createHash('md5')
      .update(hashes.join(0x00), 'utf8')
      .digest('hex');
  }

  processFile(relativePath, moduleName) {
    const key = relativePath + 0x00 + moduleName;
    const entry = this.cache.get(key);
    const outputFilePath = path.posix.join(this.outputPath, relativePath);

    fs.ensureDirSync(path.dirname(outputFilePath));

    if (entry.isCached) {
      //  populate from cache
      fs.writeFileSync(outputFilePath, entry.value);
      return;
    }

    const rollup = require('rollup');
    const resolve = require('rollup-plugin-node-resolve');
    const commonjs = require('rollup-plugin-commonjs');

    if (!relativePath.startsWith(NODE_MODULES)) {
      throw new Error(`The "cjs" transform works only with NPM packages.
You tried to use it with "${relativePath}". Make sure your imported file path
begins with "node_modules/".`);
    }

    const fullPath = resolveSync(relativePath.slice(NODE_MODULES.length), {
      basedir: this.parentRoot,
    });

    let plugins = this.options[relativePath].plugins || [];

    let inputOptions = {
      input: fullPath,
      plugins: [
        resolve({
          browser: true,
        }),
        commonjs(),
      ].concat(plugins),
    };

    let outputOptions = {
      file: outputFilePath,
      format: 'amd',
      amd: { id: moduleName },
      exports: 'named',
    };

    return rollup.rollup(inputOptions).then(bundle => {
      return bundle.generate(outputOptions).then(result => {
        // populate cache
        let code = result.code;
        this.cache.set(key, code);
        fs.writeFileSync(outputFilePath, code);
      });
    });
  }
};
