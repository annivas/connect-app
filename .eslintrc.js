module.exports = {
  root: true,
  extends: [
    '@react-native',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react-native/no-inline-styles': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  ignorePatterns: ['dist/', '.expo/', 'node_modules/', 'babel.config.js', 'metro.config.js', 'tailwind.config.js'],
};
