module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module',
  },
  extends: 'eslint:recommended',
  env: {
    browser: true,
  },
  rules: {
  },
  overrides: [
    // node files
    {
      files: [
        './ember-cli-build.js',
        './testem.js',
        './index.js',
        'config/**/*.js',
      ],
      parserOptions: {
        sourceType: 'script',
        ecmaVersion: 2015,
      },
      env: {
        browser: false,
        node: true,
      }
    },

    // test files
    {
      files: ['tests/**/*.js'],
        env: {
          embertest: true,
        }
    },
  ]
};
