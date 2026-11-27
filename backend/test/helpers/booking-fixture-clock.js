import { beforeEach } from 'node:test';

// November booking fixtures use a fixed wall clock. Real timers remain active.
// Boundary regressions supply explicit dates instead of using this helper.
beforeEach(t => t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-15T12:00:00Z') }));
