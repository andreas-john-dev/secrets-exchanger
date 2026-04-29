// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      strict: "error",
      semi: ["error", "always"],
      "no-cond-assign": ["error", "always"],
    },
  },
  {
    ignores: ["node_modules/**", "lib/**", "cdk.out/**", "src/stacks/website/secrets-exchanger-web-app/**"],
  }
);
