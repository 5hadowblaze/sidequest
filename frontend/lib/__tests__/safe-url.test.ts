import { describe, expect, it } from "vitest";

import { sanitizeExternalUrl, sanitizeImageUrl } from "@/lib/safe-url";

describe("sanitizeExternalUrl", () => {
  it("allows https URLs", () => {
    expect(sanitizeExternalUrl("https://example.com/event")).toBe(
      "https://example.com/event",
    );
    expect(sanitizeExternalUrl("https://cdn.example.com/img.jpg?w=400")).toBe(
      "https://cdn.example.com/img.jpg?w=400",
    );
  });

  it("blocks non-https schemes", () => {
    expect(sanitizeExternalUrl("http://example.com")).toBeNull();
    expect(sanitizeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeExternalUrl("data:text/html,<script>")).toBeNull();
    expect(sanitizeExternalUrl("vbscript:msgbox(1)")).toBeNull();
    expect(sanitizeExternalUrl("file:///etc/passwd")).toBeNull();
    expect(sanitizeExternalUrl("blob:https://example.com/uuid")).toBeNull();
  });

  it("blocks protocol-relative URLs", () => {
    expect(sanitizeExternalUrl("//evil.com/phish")).toBeNull();
  });

  it("returns null for empty or invalid input", () => {
    expect(sanitizeExternalUrl("")).toBeNull();
    expect(sanitizeExternalUrl("   ")).toBeNull();
    expect(sanitizeExternalUrl(null)).toBeNull();
    expect(sanitizeExternalUrl(undefined)).toBeNull();
    expect(sanitizeExternalUrl("not-a-url")).toBeNull();
  });
});

describe("sanitizeImageUrl", () => {
  it("returns safe https URLs unchanged", () => {
    expect(sanitizeImageUrl("https://images.example.com/pic.jpg")).toBe(
      "https://images.example.com/pic.jpg",
    );
  });

  it("falls back to placeholder for unsafe URLs", () => {
    expect(sanitizeImageUrl("javascript:alert(1)")).toBe("/icon.svg");
    expect(sanitizeImageUrl("http://insecure.example.com/img.jpg")).toBe(
      "/icon.svg",
    );
    expect(sanitizeImageUrl("")).toBe("/icon.svg");
  });
});
