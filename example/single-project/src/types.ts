/**
 * Supported operations.
 */
export type Operation = "add" | "subtract" | "multiply" | "divide";

/**
 * Result of a calculation.
 */
export interface CalculatorResult {
  /** The operation performed */
  operation: Operation;
  /** Input operands */
  operands: [number, number];
  /** Result value */
  result: number;
  /** Timestamp of calculation */
  timestamp: Date;
}
