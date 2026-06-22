import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import { signToken, authenticateToken, type AuthTokenPayload } from "../src/auth";

describe("auth.signToken", () => {
  it("round-trips a JWT", () => {
    const payload: AuthTokenPayload = { sub: 7, username: "mestra", role: "admin" };
    const token = signToken(payload);
    const decoded = jwt.verify(token, "dev-secret-change-me") as AuthTokenPayload;
    expect(decoded.sub).toBe(7);
    expect(decoded.username).toBe("mestra");
  });
});

describe("auth.authenticateToken", () => {
  it("rejects missing token", () => {
    const req = { headers: {} } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();
    authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects malformed token", () => {
    const req = { headers: { authorization: "Bearer not-a-jwt" } } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();
    authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts a valid token and calls next", () => {
    const token = signToken({ sub: 1, username: "u", role: "user" });
    const req = { headers: { authorization: `Bearer ${token}` } } as any;
    const res = {} as any;
    const next = vi.fn();
    authenticateToken(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.sub).toBe(1);
  });
});
