import { Hono } from 'hono';
import { sign } from 'hono/jwt';

const app = new Hono<{
  Bindings: {
    ADMIN_SECRET_KEY: string;
    ADMIN_USERNAME?: string;
    ADMIN_PASSWORD?: string;
  };
}>();

// Login page
app.get('/', async (c) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 2rem;
            background: #f5f5f5;
        }
        .container {
            max-width: 300px;
            margin: 2rem auto;
            background: white;
            padding: 2rem;
            border: 1px solid #ddd;
        }
        h1 {
            margin: 0 0 1.5rem 0;
            text-align: center;
        }
        label {
            display: block;
            margin-bottom: 0.5rem;
        }
        input {
            width: 100%;
            padding: 0.5rem;
            margin-bottom: 1rem;
            border: 1px solid #ccc;
            box-sizing: border-box;
        }
        button {
            width: 100%;
            padding: 0.75rem;
            background: #333;
            color: white;
            border: none;
            cursor: pointer;
        }
        .message {
            margin-top: 1rem;
            text-align: center;
            display: none;
        }
        .error { color: red; }
        .success { color: green; }
        .token {
            background: #f9f9f9;
            border: 1px solid #ddd;
            padding: 1rem;
            margin-top: 1rem;
            font-family: monospace;
            word-break: break-all;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Admin Login</h1>
        <form id="form">
            <label>Username</label>
            <input type="text" id="username" required>
            <label>Password</label>
            <input type="password" id="password" required>
            <button type="submit">Login</button>
        </form>
        <div id="error" class="message error"></div>
        <div id="success" class="message success"></div>
        <div id="token" class="token"></div>
    </div>

    <script>
        document.getElementById('form').onsubmit = async (e) => {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const error = document.getElementById('error');
            const success = document.getElementById('success');
            const token = document.getElementById('token');

            error.style.display = 'none';
            success.style.display = 'none';
            token.style.display = 'none';

            try {
                const res = await fetch('/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();

                if (res.ok) {
                    success.textContent = 'Login successful';
                    success.style.display = 'block';
                    token.textContent = data.token;
                    token.style.display = 'block';
                    document.getElementById('form').reset();
                } else {
                    error.textContent = data.error || 'Login failed';
                    error.style.display = 'block';
                }
            } catch (err) {
                error.textContent = 'Network error';
                error.style.display = 'block';
            }
        };
    </script>
</body>
</html>
  `;

  return c.html(html);
});

// Login endpoint
app.post('/login', async (c) => {
  const { username, password } = await c.req.json();

  // Get admin username and password from environment variables, use defaults if not set
  const adminUsername = c.env.ADMIN_USERNAME || 'admin';
  const adminPassword = c.env.ADMIN_PASSWORD || 'admin';

  if (username !== adminUsername || password !== adminPassword) {
    return c.json({ error: 'Invalid username or password' }, 401);
  }

  // JWT token
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    username: username,
    role: 'admin',
    iat: now,
    exp: now + 1 * 60 * 60, // 1 hour later
  };
  const token = await sign(payload, c.env.ADMIN_SECRET_KEY);

  return c.json({
    success: true,
    token,
    message: 'Login successful',
  });
});

export default app;
