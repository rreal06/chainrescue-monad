module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: ["eslint:recommended", "plugin:react-hooks/recommended", "prettier"],
  ignorePatterns: ["dist", "artifacts", "cache", "node_modules", "typechain-types"],
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
  overrides: [{ files: ["test/**/*.ts"], env: { mocha: true } }],
  rules: { "react-refresh/only-export-components": "off", "no-unused-vars": "off" }
};
