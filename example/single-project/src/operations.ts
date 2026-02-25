/**
 * Add two numbers.
 */
export function add(a: number, b: number): number {
  return a + b;
}

/**
 * Subtract two numbers.
 */
export function subtract(a: number, b: number): number {
  return a - b;
}

/**
 * Multiply two numbers.
 */
export function multiply(a: number, b: number): number {
  return a * b;
}

/**
 * Divide two numbers.
 * @throws Error if dividing by zero
 */
export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error("Cannot divide by zero");
  }
  return a / b;
}
