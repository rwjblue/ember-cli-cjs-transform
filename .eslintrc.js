module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2015,
  },
  plugins: ['prettier', 'node'],
  extends: ['eslint:recommended', 'prettier', 'plugin:node/recommended'],
  env: {
    node: true,
  },
  rules: {
    'prettier/prettier': ['error', {
      singleQuote: true,
      trailingComma: 'es5',
      printWidth: 100,
    }],
  },

  overrides: [
    {
      files: ['tests/**/*.js'],
      env: {
        qunit: true,
      }
    }
  ]
};
