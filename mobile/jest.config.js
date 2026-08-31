module.exports = {
  testEnvironment: 'node',
  globals: {
    __DEV__: true,
  },
  moduleFileExtensions: [
    'android.js',
    'ios.js',
    'android.ts',
    'ios.ts',
    'android.tsx',
    'ios.tsx',
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  setupFilesAfterEnv: [],
  testPathIgnorePatterns: ['/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/app/$1',
  },
};
