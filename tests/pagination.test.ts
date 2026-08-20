import { describe, expect, it } from "vitest";
import { getPageCount, getPageItems } from "../src/lib/pagination";

describe("getPageCount", () => {
  it("returns at least 1 for empty data", () => {
    expect(getPageCount(0, 9)).toBe(1);
  });

  it("computes ceil division", () => {
    expect(getPageCount(45, 9)).toBe(5);
    expect(getPageCount(46, 9)).toBe(6);
  });

  it("guards against zero/negative page size and total", () => {
    expect(getPageCount(0, 0)).toBe(1);
    expect(getPageCount(-5, 9)).toBe(1);
  });
});

describe("getPageItems", () => {
  it("renders every page for small ranges", () => {
    expect(getPageItems(1, 5)).toEqual([
      { type: "page", value: 1 },
      { type: "page", value: 2 },
      { type: "page", value: 3 },
      { type: "page", value: 4 },
      { type: "page", value: 5 },
    ]);
  });

  it("clamps the current page into range", () => {
    const items = getPageItems(99, 3);
    expect(items.map((i) => i.value)).toEqual([1, 2, 3]);
  });

  it("emits a right ellipsis when the current page is early", () => {
    const items = getPageItems(1, 20);
    const values = items.map((i) => i.value);
    const types = items.map((i) => i.type);
    expect(values[0]).toBe(1);
    expect(values[1]).toBe(2);
    expect(values[values.length - 1]).toBe(20);
    expect(types).toContain("ellipsis");
  });

  it("emits both ellipses for a middle page on a wide range", () => {
    const items = getPageItems(10, 20);
    expect(items.filter((i) => i.type === "ellipsis").length).toBe(2);
    const values = items.map((i) => i.value);
    expect(values[values.length - 1]).toBe(20);
  });

  it("emits a left ellipsis when the current page is late", () => {
    const items = getPageItems(20, 20);
    expect(items.filter((i) => i.type === "ellipsis").length).toBe(1);
    expect(items.map((i) => i.value)).toContain(19);
    expect(items.map((i) => i.value)).toContain(20);
  });

  it("returns an empty list for invalid input", () => {
    expect(getPageItems(0, 0)).toEqual([]);
    expect(getPageItems(-1, 10)).toEqual([]);
  });
});