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
  // Explicitly save the session before responding so it's in the store
  // before the next request arrives (important with async/remote stores).
  req.session.save((err) => {
    if (err) {
      res.status(500).json({ error: "Session konnte nicht gespeichert werden" });
      return;
    }
    res.json({ ok: true });
  });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/auth/me", (req, res): void => {
  // Must not be cached — the session state can change at any time.
  res.set("Cache-Control", "no-store");
  const authenticated = (req.session as any).authenticated === true;
  res.json({ authenticated });
});

export default router;
