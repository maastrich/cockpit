import { add, subtract, multiply, divide } from "./operations.js";
import type { Operation, CalculatorResult } from "./types.js";

/**
 * Calculator class with history tracking.
 */
export class Calculator {
  private history: CalculatorResult[] = [];

  /**
   * Perform a calculation and store in history.
   */
  calculate(operation: Operation, a: number, b: number): number {
    let result: number;

    switch (operation) {
      case "add":
        result = add(a, b);
        break;
      case "subtract":
        result = subtract(a, b);
        break;
      case "multiply":
        result = multiply(a, b);
        break;
      case "divide":
        result = divide(a, b);
        break;
    }

    this.history.push({
      operation,
      operands: [a, b],
      result,
      timestamp: new Date(),
    });

    return result;
  }

  /**
   * Get calculation history.
   */
  getHistory(): CalculatorResult[] {
    return [...this.history];
  }

  /**
   * Clear calculation history.
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Get the last result, or undefined if no calculations.
   */
  getLastResult(): number | undefined {
    return this.history.at(-1)?.result;
  }
}
