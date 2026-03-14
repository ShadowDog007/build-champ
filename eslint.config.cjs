const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  ...tsPlugin.configs['flat/recommended'],
];
