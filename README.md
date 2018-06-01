# ember-cli-cjs-transform

This addon allows importing files that are in the CommonJS format via the
standard `app.import` functionality added in ember-cli 2.16.

## Installing

```
ember install ember-cli-cjs-transform
```

## Usage

In your `ember-cli-build.js` file just like the `amd` transform!

For example, add the following to import `some-name`'s `index.js` into your build:

```js
app.import('node_modules/some-name/index.js', {
  using: [
    { transformation: 'cjs', as: 'some-name'}
  ]
});
```

At build time we automatically follow all dependencies (e.g. internal `require`
calls) in the source file, and includes their contents in the final build
output.

This means that even for reasonably complicated things, we can `app.import` the
"entry point" files and everything "just" works.

Examples (used while testing functionality):

Bringing in `showdown` and `showdown-highlight` for usage (without extra "shim" addon packages!):

```js
app.import('node_modules/showdown/dist/showdown.js', {
  using: [{ transformation: 'cjs', as: 'showdown' }]
});
app.import('node_modules/showdown-highlight/lib/index.js', {
  using: [{ transformation: 'cjs', as: 'showdown-highlight' }]
});
app.import('node_modules/highlight.js/styles/tomorrow-night.css');
```

There may be cases where you need additional rollup plugins in order to import your CommonJs files. For example, you may need to handle builtin node require statements, i.e.

```
var path = require('path');
```

For this, you may want to import the rollup plugin `rollup-plugin-node-builtins`. In order to do this, include the plugin in your `package.json` and use the following syntax in your `ember-cli-build.js` or `index.js`:

```js
const nodeBuiltins = require('rollup-plugin-node-builtins');

app.import('node_modules/some-name/index.js', {
  using: [
    { transformation: 'cjs', as: 'some-name', plugins: [ nodeBuiltins() ]}
  ]
});
```

You can include multiple rollup plugins in the array and pass in options via the arguments to your plugin creation function.

```js
app.import('node_modules/some-name/index.js', {
  using: [
    {
      transformation: 'cjs',
      as: 'some-name',
      plugins: [
        plugin1(),
        plugin2({ option1: "value" })
      ]
    }
  ]
});
```

## Contributing

### Installation

* `git clone <repository-url>` this repository
* `cd ember-cli-cjs-transform`
* `yarn install`

### Running

* `ember serve`
* Visit your app at [http://localhost:4200](http://localhost:4200).

### Running Tests

* `yarn test` (Runs `ember try:each` to test your addon against multiple Ember versions)
* `ember test`
* `ember test --server`

### Building

* `ember build`

For more information on using ember-cli, visit [https://ember-cli.com/](https://ember-cli.com/).
