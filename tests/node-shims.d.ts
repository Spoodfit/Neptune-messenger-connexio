declare module "node:test" {
  type TestFunction = () => void | Promise<void>;
  const test: (name: string, fn: TestFunction) => void;
  export default test;
}

declare module "node:assert/strict" {
  interface StrictAssert {
    equal(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
  }
  const assert: StrictAssert;
  export default assert;
}
