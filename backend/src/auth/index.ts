import { Router, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "../config";
import { getUserByUsername, getUserById } from "../db";

export const authRouter = Router();

export interface AuthTokenPayload {
  sub: number;
  username: string;
  role: string;
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "missing_token" });
    return;
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as unknown as AuthTokenPayload;
    (req as any).user = decoded;
    next();
  } catch {
    res.status(403).json({ error: "invalid_token" });
  }
}

authRouter.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    res.status(400).json({ error: "missing_credentials" });
    return;
  }
  try {
    const user = await getUserByUsername(String(username));
    if (!user) {
      res.status(401).json({ error: "invalid_credentials" });
      return;
    }
    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) {
      res.status(401).json({ error: "invalid_credentials" });
      return;
    }
    const token = signToken({ sub: user.id, username: user.username, role: user.role });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: "login_failed", detail: String(err) });
  }
});

authRouter.post("/logout", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

authRouter.get("/me", authenticateToken, async (req: Request, res: Response) => {
  const payload = (req as any).user as AuthTokenPayload;
  try {
    const user = await getUserById(payload.sub);
    if (!user) {
      res.status(404).json({ error: "user_not_found" });
      return;
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "me_failed", detail: String(err) });
  }
});
