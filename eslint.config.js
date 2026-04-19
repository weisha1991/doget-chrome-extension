import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.js", "scripts/**/*.js"],
    languageOptions: {
      globals: {
        chrome: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
