// ============================================================================
// DEPRECATED CONTAINER PREVIEW WRAPPER
// ============================================================================
// NOTE: This server.ts file is NOT used in the production Vercel deployment.
// It exists solely to satisfy the Google AI Studio container sandbox runtime
// by starting a lightweight static files server on Port 3000.
//
// The absolute production source of truth is the framework-free `/site` folder.
// ============================================================================

import express from "express";
import path from "path";

const app = express();
const PORT = 3000;

// Serve the framework-free static calculator files directly on port 3000
app.use(express.static(path.join(process.cwd(), "site")));

// Ensure root endpoint resolves the landing page
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "site", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

