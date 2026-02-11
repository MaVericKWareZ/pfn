# PFN Backend - Testing Guide

## Overview

This backend implements a comprehensive testing strategy with three layers:
1. **Unit Tests** - Domain logic testing
2. **Integration Tests** - Service and application layer testing
3. **E2E Tests** - Full game flow testing

## Test Structure

```
backend/
├── src/
│   ├── domain/__tests__/          # Unit tests for domain layer
│   │   ├── game-engine.spec.ts
│   │   ├── scoring-engine.spec.ts
│   │   └── deck-manager.spec.ts
│   └── application/__tests__/     # Integration tests for services
│       ├── room.service.spec.ts
│       └── timer.service.spec.ts
└── test/
    └── game-flow.e2e-spec.ts      # E2E tests for full game flow
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm test -- --testPathPattern="src/.*\.spec\.ts"
```

### Integration Tests Only
```bash
npm test -- --testPathPattern="application/.*\.spec\.ts"
```

### E2E Tests
```bash
npm run test:e2e
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:cov
```

## Test Coverage

The test suite maintains 80%+ coverage across:
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

## Test Philosophy

### Unit Tests
- Test business logic in isolation
- No external dependencies
- Fast execution
- Deterministic results

### Integration Tests
- Test service interactions
- Mock external dependencies
- Verify state management
- Test error handling

### E2E Tests
- Test complete user flows
- Real WebSocket connections
- Multi-client scenarios
- Timer integration

## Key Test Scenarios

### Domain Layer (Unit)
- ✅ Game state transitions
- ✅ Scoring calculations
- ✅ Deck shuffling and drawing
- ✅ Turn management
- ✅ Role assignment

### Application Layer (Integration)
- ✅ Room creation and joining
- ✅ Team assignment and shuffling
- ✅ Game start validation
- ✅ Player reconnection
- ✅ Timer lifecycle

### Full Game Flow (E2E)
- ✅ Complete game from lobby to game over
- ✅ Multi-player interactions
- ✅ NO! penalty mechanics
- ✅ Skip card mechanics
- ✅ Turn rotation
- ✅ Timer synchronization

## Writing New Tests

### Unit Test Example
```typescript
describe('MyComponent', () => {
  it('should perform expected behavior', () => {
    // Arrange
    const input = createTestData();
    
    // Act
    const result = component.method(input);
    
    // Assert
    expect(result).toBe(expectedValue);
  });
});
```

### Integration Test Example
```typescript
describe('MyService', () => {
  let service: MyService;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [MyService, MockDependency],
    }).compile();
    
    service = module.get<MyService>(MyService);
  });
  
  it('should integrate with dependencies', () => {
    // Test service with mocked dependencies
  });
});
```

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Main branch commits
- Pre-deployment

Minimum coverage thresholds must be met for builds to pass.

## Debugging Tests

### Run specific test file
```bash
npm test -- game-engine.spec.ts
```

### Run specific test case
```bash
npm test -- -t "should start game"
```

### Debug in VS Code
Add breakpoints and use the Jest debug configuration.

## Best Practices

1. **Isolation**: Each test should be independent
2. **Clarity**: Test names should describe behavior
3. **Coverage**: Focus on business logic, not just coverage %
4. **Speed**: Keep unit tests fast (<100ms each)
5. **Reliability**: Tests should not be flaky
6. **Maintainability**: Avoid brittle tests that break on refactoring

## Dependencies

- `jest`: Test runner
- `ts-jest`: TypeScript support
- `@nestjs/testing`: NestJS testing utilities
- `socket.io-client`: E2E WebSocket testing
