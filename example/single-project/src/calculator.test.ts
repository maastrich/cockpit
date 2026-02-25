import { describe, expect, it, beforeEach } from "bun:test";
import { Calculator } from "./calculator.js";
import { add, subtract, multiply, divide } from "./operations.js";

describe("Operations", () => {
  describe("add", () => {
    it("should add two positive numbers", () => {
      expect(add(2, 3)).toBe(5);
    });

    it("should handle negative numbers", () => {
      expect(add(-2, 3)).toBe(1);
      expect(add(2, -3)).toBe(-1);
      expect(add(-2, -3)).toBe(-5);
    });

    it("should handle zero", () => {
      expect(add(0, 5)).toBe(5);
      expect(add(5, 0)).toBe(5);
    });
  });

  describe("subtract", () => {
    it("should subtract two numbers", () => {
      expect(subtract(5, 3)).toBe(2);
      expect(subtract(3, 5)).toBe(-2);
    });
  });

  describe("multiply", () => {
    it("should multiply two numbers", () => {
      expect(multiply(3, 4)).toBe(12);
      expect(multiply(-3, 4)).toBe(-12);
      expect(multiply(0, 100)).toBe(0);
    });
  });

  describe("divide", () => {
    it("should divide two numbers", () => {
      expect(divide(10, 2)).toBe(5);
      expect(divide(7, 2)).toBe(3.5);
    });

    it("should throw on division by zero", () => {
      expect(() => divide(10, 0)).toThrow("Cannot divide by zero");
    });
  });
});

describe("Calculator", () => {
  let calc: Calculator;

  beforeEach(() => {
    calc = new Calculator();
  });

  it("should perform calculations", () => {
    expect(calc.calculate("add", 2, 3)).toBe(5);
    expect(calc.calculate("multiply", 4, 5)).toBe(20);
  });

  it("should track history", () => {
    calc.calculate("add", 1, 2);
    calc.calculate("subtract", 10, 5);

    const history = calc.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].operation).toBe("add");
    expect(history[0].result).toBe(3);
    expect(history[1].operation).toBe("subtract");
    expect(history[1].result).toBe(5);
  });

  it("should get last result", () => {
    expect(calc.getLastResult()).toBeUndefined();

    calc.calculate("add", 1, 1);
    expect(calc.getLastResult()).toBe(2);

    calc.calculate("multiply", 3, 3);
    expect(calc.getLastResult()).toBe(9);
  });

  it("should clear history", () => {
    calc.calculate("add", 1, 1);
    calc.calculate("add", 2, 2);
    expect(calc.getHistory()).toHaveLength(2);

    calc.clearHistory();
    expect(calc.getHistory()).toHaveLength(0);
  });
});
