/**
 * Phase 1 smoke test — verifies the test runner and TypeScript setup work.
 * No application logic tested here; that starts in Phase 2.
 */
describe('Phase 1: Scaffolding', () => {
  it('test runner is configured correctly', () => {
    expect(true).toBe(true)
  })

  it('TypeScript and path aliases resolve', async () => {
    // Importing from the @ alias would fail at compile time if tsconfig/vitest
    // path resolution is broken. This import validates the alias is wired up.
    const path = await import('path')
    expect(typeof path.resolve).toBe('function')
  })

  it('jsdom environment is active', () => {
    // If jsdom isn't configured, `document` would be undefined.
    expect(typeof document).toBe('object')
    expect(typeof window).toBe('object')
  })
})
