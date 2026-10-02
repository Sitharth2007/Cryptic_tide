"""Generate 5 admin accounts with bcrypt hashes."""
import secrets
import string
import csv
import bcrypt

def gen_password(length=14):
    chars = string.ascii_letters + string.digits + "!@#$%^&*"
    while True:
        p = "".join(secrets.choice(chars) for _ in range(length))
        if (any(c.isupper() for c in p) and any(c.islower() for c in p)
                and any(c.isdigit() for c in p) and any(c in "!@#$%^&*" for c in p)):
            return p

admins = [
    {"num": 1, "name": "Admin 001", "email": "admin001@cryptictide.in", "role": "SUPER_ADMIN"},
    {"num": 2, "name": "Admin 002", "email": "admin002@cryptictide.in", "role": "ADMIN"},
    {"num": 3, "name": "Admin 003", "email": "admin003@cryptictide.in", "role": "ADMIN"},
    {"num": 4, "name": "Admin 004", "email": "admin004@cryptictide.in", "role": "ADMIN"},
    {"num": 5, "name": "Admin 005", "email": "admin005@cryptictide.in", "role": "ADMIN"},
]

rows = []
for a in admins:
    pw = gen_password()
    salt = bcrypt.gensalt(rounds=12)
    ph = bcrypt.hashpw(pw.encode("utf-8"), salt).decode("utf-8")
    rows.append({**a, "password": pw, "password_hash": ph})

# Write CSV
with open("admin_credentials.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["num", "name", "email", "role", "password"])
    writer.writeheader()
    for r in rows:
        writer.writerow({k: r[k] for k in ["num", "name", "email", "role", "password"]})

print("[SUCCESS] admin_credentials.csv written")

# Write SQL seed
sql_lines = [
    "-- ============================================================",
    "-- Cryptic Tide — Admin Accounts Seed",
    "-- Run AFTER 002_custom_auth.sql in Supabase SQL Editor",
    "-- ============================================================",
    "",
    "INSERT INTO public.admin_accounts (name, email, password_hash, role, is_active)",
    "VALUES",
]
value_parts = []
for r in rows:
    value_parts.append(
        f"  ('{r['name']}', '{r['email']}', '{r['password_hash']}', '{r['role']}', TRUE)"
    )
sql_lines.append(",\n".join(value_parts) + ";")

with open("supabase/seed_admins.sql", "w", encoding="utf-8") as f:
    f.write("\n".join(sql_lines) + "\n")

print("[SUCCESS] supabase/seed_admins.sql written")
print()
print(f"{'Email':<35} {'Role':<12} Password")
print("-" * 75)
for r in rows:
    print(f"{r['email']:<35} {r['role']:<12} {r['password']}")
