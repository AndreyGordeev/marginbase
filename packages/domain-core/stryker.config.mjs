/**
 * Stryker Mutation Testing Configuration
 * Tests the quality of test suite by injecting mutations into source code
 * and verifying tests catch them.
 */

export default {
  // Test runner configuration (v9.x uses just testRunner, auto-detects framework)
  testRunner: 'vitest',

  // Mutants to inject
  mutate: ['src/**/*.ts', '!src/index.ts'],
  mutators: [
    'ArithmeticOperator',
    'ArrayLiteral',
    'AssignmentOperator',
    'BigIntLiteral',
    'BlockStatement',
    'BooleanLiteral',
    'ConditionalExpression',
    'DoWhileStatement',
    'EqualityOperator',
    'ForStatement',
    'IfStatement',
    'LogicalOperator',
    'MethodExpression',
    'NegatedExpression',
    'ObjectLiteral',
    'RegExp',
    'ReturnValue',
    'StringLiteral',
    'StringCharAt',
    'UnaryOperator',
    'UpdateOperator',
    'WhileStatement',
  ],

  // Reporting
  reporters: ['progress', 'clear-text'],
  coverageAnalysis: 'perTest',

  // Performance tuning
  concurrency: 4,
  timeoutMS: 60000,
  timeoutFactor: 1.5,

  // Mutation testing score thresholds (v9.x format)
  mutationScore: {
    threshold: 65,
    thresholdFatal: 50,
  },

  // Disable incremental for CI consistency
  incremental: false,
};
