import { describe, expect, it } from "vitest";

import { extractEmail, extractPhone, redactPii } from "@/lib/pii";

describe("pii helpers", () => {
  it("extracts an email from text", () => {
    expect(extractEmail("Contact jane.doe@example.com now")).toBe(
      "jane.doe@example.com",
    );
    expect(extractEmail("no email here")).toBeNull();
  });

  it("extracts a phone number and normalizes separators", () => {
    const result = extractPhone("+62 812 3456 7890");
    expect(result).toBeTruthy();
    expect(result?.replace(/[^0-9+]/g, "")).toMatch(/^\+?6281234567890$/);
  });

  it("extracts local Indonesian mobile formats", () => {
    expect(extractPhone("Telp: 0812-3456-7890")).toBe("081234567890");
    expect(extractPhone("HP 08123456789")).toBe("08123456789");
  });

  it("does not treat year ranges as phone numbers", () => {
    expect(extractPhone("May 2024 - Jul 2026")).toBeNull();
    expect(extractPhone("No contact provided")).toBeNull();
  });

  it("redacts phone numbers when phone is masked", () => {
    const out = redactPii("Call +62 812 3456 7890 today", ["phone"]);
    expect(out).not.toContain("81234567890");
    expect(out).toContain("[PHONE]");
  });

  it("redacts dates of birth when masked", () => {
    const out = redactPii("Born 12/05/1990", ["dateOfBirth"]);
    expect(out).toContain("[DOB]");
  });

  it("redacts address lines when masked", () => {
    const out = redactPii("Home: 12 Main Street, Jakarta", ["address"]);
    expect(out).not.toContain("Main Street");
  });

  it("leaves non-masked text intact", () => {
    const text = "Software Engineer with 4 years of React experience.";
    expect(redactPii(text, ["address"])).toBe(text);
  });
});
