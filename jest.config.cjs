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
