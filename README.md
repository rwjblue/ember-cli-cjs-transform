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

When the file is imported it will have access to `require`, but unlike other
solutions (e.g. `browserify`, `rollup`, etc) no attempt is made to ensure all
files that are going to be required will be present in the final output. This
means that you have to manually `app.import` each of the files that will be
required at runtime.

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
