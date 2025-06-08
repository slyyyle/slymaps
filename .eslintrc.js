module.exports = {
  root: true,
  extends: ['next/core-web-vitals'],
  overrides: [
    // Test files
    {
      files: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
    // React components with allowed any for JSON display
    {
      files: ['src/components/agency-browser.tsx', 'src/hooks/use-oba-explorer.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
}; 