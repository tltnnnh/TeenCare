import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Email Notifications
  app.post("/api/notify", (req, res) => {
    const { email, userName, action, details, timestamp } = req.body;
    
    console.log(`[EMAIL NOTIFICATION]
    To: ${email}
    Subject: TeenCare: ${action}
    Content:
    Chào ${userName},
    Hệ thống ghi nhận hành động mới từ tài khoản của bạn:
    - Hành động: ${action}
    - Chi tiết: ${details}
    - Thời gian: ${timestamp}
    
    Cảm ơn bạn đã sử dụng TeenCare!`);

    // In a real app, you would use nodemailer or a service like Resend here.
    // For now, we simulate success.
    res.json({ success: true, message: "Email notification sent (simulated)" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
