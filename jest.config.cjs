// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  clearMocks: true,
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/__mocks__/fileMock.js',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    "/node_modules/(?!axios)"
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    '*.{ts,tsx}',
    '!**/node_modules/**',
    '!__mocks__/**',
    '!coverage/**',
    '!backend/**',
    '!*.config.cjs',
    '!*.setup.js',
    '!**/*.test.{ts,tsx}',
    '!**/*.d.ts',
    '!index.tsx',
    '!vite.config.ts',
    '!jest.config.cjs',
    '!jest.setup.js',
    '!babel.config.cjs',
    '!env.tsx'
  ],
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
};
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // if we create a setup file
  moduleNameMapper: {
    // Handle CSS imports (if any in components)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Handle image imports
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/__mocks__/fileMock.js',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest', // Ensure babel-jest handles JS/JSX files
  },
  transformIgnorePatterns: [
     "/node_modules/(?!axios)" // Example: Don't ignore 'axios' if it needs transpilation and is ESM
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/tests-e2e/"
  ],
  watchPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/tests-e2e/"
  ],
};
