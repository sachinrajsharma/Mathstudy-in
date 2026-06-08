# MathStudy.in — Admin & Database Access

Logins for the **Node e-book shop**. These are separate from your Cloudflare,
Hostinger, and cPanel/WHM accounts.

---

## 1. Admin panel

There's no separate admin login page — you sign in as a normal user and, because
your account has the `super_admin` role, the admin area unlocks.

1. Go to **`https://mathstudy.in/auth/login`** and sign in.
2. Open **`https://mathstudy.in/admin`** (also linked from your Dashboard).

**Credentials** (created by `scripts/setup-db.js` on first DB setup):
- **Email:** the `ADMIN_EMAIL` from your `.env` (default `admin@mathstudy.in`).
- **Password:** the `ADMIN_PASSWORD` from your `.env`. If you left it blank, setup
  **generated a strong random password and printed it once** in the terminal —
  save it from there. (No password is hardcoded in the code anymore.)

### Change your password
Dashboard → **🔒 Change password**, or go to **`/account/password`**.
Enter current + new (min 8 chars). Do this right after first login.

---

## 2. Database

- **DB name:** `mathstudy`
- **User / password:** your `.env` `DB_USER` / `DB_PASS` (on the VPS, the dedicated
  `mathstudy` user from `DEPLOY.md`; locally `root` with no password).
- **Host:** `localhost:3306` — MySQL is **not** exposed to the internet.

**A) On the VPS over SSH**
```bash
ssh deploy@SERVER_IP
mysql -u mathstudy -p mathstudy
```
```sql
SHOW TABLES;
SELECT id,name,email,role FROM users;
SELECT id,title,price,is_published FROM products;
```

**B) From a desktop GUI (TablePlus / DBeaver / MySQL Workbench)**
Use an **SSH tunnel** (port 3306 is firewalled):
- SSH host `SERVER_IP`, SSH user `deploy` (+ key/password)
- DB host `127.0.0.1`, port `3306`, user `mathstudy`, password `DB_PASS`, database `mathstudy`

**C) Local dev:** host `localhost`, user `root`, no password, database `mathstudy`.

---

## 3. Emergency: reset a password directly in the DB

If you ever get locked out, set a new password in MySQL. Two ways:

**Best (real bcrypt hash):** on the server run
```bash
node -e "console.log(require('bcryptjs').hashSync('YourNewPassword',12))"
```
then paste the output:
```sql
UPDATE users SET password_hash='<paste-the-$2b$-hash>' WHERE email='your-admin-email';
```

**Quick (no Node handy):**
```sql
UPDATE users SET password_hash = SHA2('YourNewPassword', 256) WHERE email='your-admin-email';
```
This still works — the app accepts the legacy hash and automatically upgrades it
to bcrypt the next time you log in.

---

## 4. Security notes

- Passwords are hashed with **bcrypt** (cost 12). Any old SHA-256 accounts keep
  working and are auto-upgraded to bcrypt on their next successful login.
- There is **no default admin password in the repo** — it comes from `.env` or is
  randomly generated at setup.
- Keep MySQL bound to `localhost` (default). Never open port 3306 to the internet;
  use the SSH tunnel for GUI access.
- Possible future hardening (ask if you want it): CSRF tokens on forms, a
  MySQL-backed session store so logins survive restarts, and 2FA for admin.
