import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/auth/login", (req, res): void => {
  const { password } = req.body ?? {};
  const expected = process.env["APP_PASSWORD"];

  if (!expected) {
    res.status(500).json({ error: "Kein Passwort konfiguriert" });
    return;
  }

  if (password !== expected) {
    res.status(401).json({ error: "Falsches Passwort" });
    return;
  }

  (req.session as any).authenticated = true;
  res.json({ ok: true });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/auth/me", (req, res): void => {
  const authenticated = (req.session as any).authenticated === true;
  res.json({ authenticated });
});

export default router;
