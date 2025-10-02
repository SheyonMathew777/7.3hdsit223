module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: ['app.js'],
  coverageDirectory: 'coverage',
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'reports/junit', outputName: 'junit.xml' }]
  ]
};
