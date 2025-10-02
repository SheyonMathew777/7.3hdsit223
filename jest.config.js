module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: ['app.js'],
  coverageDirectory: 'coverage',
  coverageThreshold: { global: { lines: 100, statements: 100 } },
  reporters: [
    'default',
    ['jest-junit', { 
      outputDirectory: 'reports/junit', 
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ]
};
