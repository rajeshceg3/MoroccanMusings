import pluginJs from "@eslint/js";
import globals from "globals";

export default [
  {
    languageOptions: {
        globals: { ...globals.browser, ...globals.serviceworker }
    }
  },
  pluginJs.configs.recommended,
  {
    rules: {
      "no-unused-vars": ["warn", { "vars": "all", "args": "none" }],
      "no-console": ["warn", { "allow": ["warn", "error", "info"] }]
    }
  }
];
