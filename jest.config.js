module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  testPathIgnorePatterns: [
    '/node_modules/', '/android/', '/ios/', '/e2e/', 'App.test.tsx', '<rootDir>/pro/',
  ],
  // Agent worktrees under .claude/worktrees/ carry full repo copies that would collide in Haste's module map.
  modulePathIgnorePatterns: ['<rootDir>/.claude/worktrees/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@offgrid/core/(.*)$': '<rootDir>/src/$1',
    // Mirrors the metro alias: 'react-native-fs' resolves to the maintained fork
    // (the only RNFS native module we ship — see metro.config.js).
    '^react-native-fs$': '<rootDir>/src/shims/react-native-fs.ts',
    // Local stand-ins for the private shared packages. Old tests that import @offgrid/sync get the chat helpers.
    '^@offgrid/(chat|models|rag|speech|ui)$': '<rootDir>/packages/$1/src/index.ts',
    '^@offgrid/sync$': '<rootDir>/packages/chat/src/index.ts',
    // The sync source lives out-of-root; when jest transforms it, babel injects @babel/runtime
    // helper imports that would otherwise resolve from ../shared (where they aren't installed).
    // Pin them to mobile's own copy.
    '^@babel/runtime/(.*)$': '<rootDir>/node_modules/@babel/runtime/$1',
  },
  transformIgnorePatterns: ['node_modules/(?!(react-native|@react-native|@react-navigation|react-native-.*|@react-native-.*|moti|@motify|@gorhom|@shopify|@ronradtke|@op-engineering|@offgrid)/)',],
  testEnvironment: 'node',
  clearMocks: true,
  verbose: true,
  testTimeout: 10000,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/index.ts',
    '!src/types/**',
    '!src/navigation/**',
  ],
  coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary'],
  coverageThreshold: {
    // `global` gates src/ at 75.
    global: {
      statements: 75,
      branches: 75,
      functions: 75,
      lines: 75,
    },
    // New standalone modules in this change set are held to 100% on every axis. Changed
    // legacy files have their NEW branches covered by the suites but aren't whole-file-100%.
    './src/utils/imageModelIntegrity.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
    './src/utils/imageGenAdvice.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
    './src/services/modelLoadErrors.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
    './src/components/ImageGenAdviceCard.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
    './src/components/VoiceRecordButton/derive.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  },
};
