import express from "express";
import { createFlags, fileAdapter } from "featurekit";

const flags = createFlags({
  source: fileAdapter({ path: "./flags.json" }),
  defaults: { newDashboard: false, betaFeature: false },
  context: {
    // In a real app, extract from your auth middleware (req.auth, session, JWT, etc.)
    extract: (req) => {
      const r = req as express.Request;
      return {
        userId: r.headers["x-user-id"] as string | undefined,
        email: r.headers["x-user-email"] as string | undefined,
      };
    },
  },
});

const app = express();

app.use(flags.middleware());

app.get("/", async (_req, res) => {
  const allFlags = await flags.getAll();
  res.json({ flags: allFlags });
});

app.get("/dashboard", async (_req, res) => {
  if (await flags.isEnabled("newDashboard")) {
    res.json({ dashboard: "new", message: "Welcome to the new dashboard!" });
  } else {
    res.json({ dashboard: "classic" });
  }
});

app.get("/beta", async (_req, res) => {
  if (await flags.isEnabled("betaFeature")) {
    res.json({ beta: true, message: "You have access to beta features." });
  } else {
    res.json({ beta: false, message: "Beta is not available for you." });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
  console.log("Try: curl -H 'x-user-id: usr_1' http://localhost:3000/beta");
});
