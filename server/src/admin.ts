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
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-container {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            width: 100%;
            max-width: 400px;
        }
        .login-title {
            text-align: center;
            color: #333;
            margin-bottom: 2rem;
            font-size: 1.5rem;
            font-weight: 600;
        }
        .form-group {
            margin-bottom: 1.5rem;
        }
        label {
            display: block;
            margin-bottom: 0.5rem;
            color: #555;
            font-weight: 500;
        }
        input[type="text"], input[type="password"] {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e1e5e9;
            border-radius: 6px;
            font-size: 1rem;
            transition: border-color 0.3s ease;
            box-sizing: border-box;
        }
        input[type="text"]:focus, input[type="password"]:focus {
            outline: none;
            border-color: #667eea;
        }
        .login-btn {
            width: 100%;
            padding: 0.75rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: transform 0.2s ease;
        }
        .login-btn:hover {
            transform: translateY(-1px);
        }
        .login-btn:active {
            transform: translateY(0);
        }
        .error-message {
            color: #e74c3c;
            text-align: center;
            margin-top: 1rem;
            display: none;
        }
        .success-message {
            color: #27ae60;
            text-align: center;
            margin-top: 1rem;
            display: none;
        }
        .token-display {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 1rem;
            margin-top: 1rem;
            word-break: break-all;
            font-family: 'Courier New', monospace;
            font-size: 0.875rem;
            display: none;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h1 class="login-title">Admin Login</h1>
        <form id="loginForm">
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" required>
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>
            </div>
            <button type="submit" class="login-btn">Login</button>
        </form>
        <div id="errorMessage" class="error-message"></div>
        <div id="successMessage" class="success-message"></div>
        <div id="tokenDisplay" class="token-display"></div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('errorMessage');
            const successDiv = document.getElementById('successMessage');
            const tokenDiv = document.getElementById('tokenDisplay');

            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';
            tokenDiv.style.display = 'none';

            try {
                const response = await fetch('/admin/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    successDiv.textContent = 'Login successful';
                    successDiv.style.display = 'block';
                    tokenDiv.innerHTML = '<strong>Your access token:</strong><br>' + data.token;
                    tokenDiv.style.display = 'block';
                    document.getElementById('loginForm').reset();
                } else {
                    errorDiv.textContent = data.error || 'Login failed';
                    errorDiv.style.display = 'block';
                }
            } catch (error) {
                errorDiv.textContent = 'Network error, please try again later';
                errorDiv.style.display = 'block';
            }
        });
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
