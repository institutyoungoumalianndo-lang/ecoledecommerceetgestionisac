import { describe, expect, it } from "vitest";
import { assertBalanced } from "./journalEntryService.js";

const ACCOUNT_A = "11111111-1111-1111-1111-111111111111";
const ACCOUNT_B = "22222222-2222-2222-2222-222222222222";

describe("assertBalanced", () => {
  it("accepte une écriture équilibrée à deux lignes", () => {
    expect(() =>
      assertBalanced([
        { accountId: ACCOUNT_A, debit: 1000, credit: 0 },
        { accountId: ACCOUNT_B, debit: 0, credit: 1000 },
      ])
    ).not.toThrow();
  });

  it("accepte une écriture équilibrée à plusieurs lignes de chaque côté", () => {
    expect(() =>
      assertBalanced([
        { accountId: ACCOUNT_A, debit: 700, credit: 0 },
        { accountId: ACCOUNT_A, debit: 300, credit: 0 },
        { accountId: ACCOUNT_B, debit: 0, credit: 1000 },
      ])
    ).not.toThrow();
  });

  it("rejette une écriture déséquilibrée", () => {
    expect(() =>
      assertBalanced([
        { accountId: ACCOUNT_A, debit: 1000, credit: 0 },
        { accountId: ACCOUNT_B, debit: 0, credit: 900 },
      ])
    ).toThrow(/déséquilibrée/);
  });

  it("rejette une ligne qui est à la fois au débit et au crédit", () => {
    expect(() =>
      assertBalanced([
        { accountId: ACCOUNT_A, debit: 500, credit: 500 },
        { accountId: ACCOUNT_B, debit: 0, credit: 1000 },
      ])
    ).toThrow();
  });

  it("rejette une ligne ni au débit ni au crédit", () => {
    expect(() =>
      assertBalanced([
        { accountId: ACCOUNT_A, debit: 0, credit: 0 },
        { accountId: ACCOUNT_B, debit: 0, credit: 1000 },
      ])
    ).toThrow();
  });

  it("rejette une écriture à moins de deux lignes", () => {
    expect(() => assertBalanced([{ accountId: ACCOUNT_A, debit: 1000, credit: 0 }])).toThrow(/au moins deux lignes/);
  });
});
