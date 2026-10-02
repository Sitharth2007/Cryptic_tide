"""
Team Credential & Seed SQL Generator for Cryptic Tide
Generates 50 pre-created team accounts with cryptographically secure passwords.
Outputs:
  - team_credentials.csv (Admin-only plaintext credentials file - EXCLUDED from git)
  - supabase/seed_teams.sql (Hashed passwords SQL seed script for PostgreSQL/Supabase)
"""
import csv
import os
import secrets
import string
import bcrypt

NUM_TEAMS = 50
DOMAIN = "cryptictide.in"
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(PROJECT_ROOT, "team_credentials.csv")
SQL_PATH = os.path.join(PROJECT_ROOT, "supabase", "seed_teams.sql")


def generate_secure_password(length: int = 12) -> str:
    """Generates a cryptographically secure random password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    while True:
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        # Ensure at least one uppercase, lowercase, digit, and special char
        if (any(c.islower() for c in password)
                and any(c.isupper() for c in password)
                and any(c.isdigit() for c in password)
                and any(c in "!@#$%^&*" for c in password)):
            return password


def hash_password(password: str) -> str:
    """Hashes plain-text password using bcrypt with salt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def main():
    print(f"Generating credentials for {NUM_TEAMS} teams...")
    teams = []

    for i in range(1, NUM_TEAMS + 1):
        team_num_str = f"{i:03d}"
        email = f"team{team_num_str}@{DOMAIN}"
        team_name = f"Team {team_num_str}"
        captain_name = f"Captain {team_num_str}"
        plain_password = generate_secure_password(12)
        hashed_password = hash_password(plain_password)

        teams.append({
            "team_number": i,
            "team_name": team_name,
            "team_lead_name": captain_name,
            "email": email,
            "password": plain_password,
            "password_hash": hashed_password,
        })

    # 1. Write CSV for Admin distribution
    os.makedirs(os.path.dirname(CSV_PATH), exist_ok=True)
    with open(CSV_PATH, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["team_number", "team_name", "email", "password"])
        for t in teams:
            writer.writerow([t["team_number"], t["team_name"], t["email"], t["password"]])
    print(f"[OK] Credentials CSV saved to: {CSV_PATH}")

    # 2. Write SQL Seed script with hashed passwords
    os.makedirs(os.path.dirname(SQL_PATH), exist_ok=True)
    with open(SQL_PATH, mode="w", encoding="utf-8") as f:
        f.write("-- ============================================================\n")
        f.write("-- Cryptic Tide -- 50 Pre-Created Teams Seed Script\n")
        f.write("-- Passwords are strictly bcrypt-hashed.\n")
        f.write("-- ============================================================\n\n")

        # First insert or update teams
        f.write("INSERT INTO public.teams (team_number, team_name, team_lead_name, team_lead_email, password_hash, registration_status, is_active)\nVALUES\n")

        val_rows = []
        for t in teams:
            esc_hash = t['password_hash'].replace("'", "''")
            esc_name = t['team_name'].replace("'", "''")
            esc_lead = t['team_lead_name'].replace("'", "''")
            val_rows.append(f"  ({t['team_number']}, '{esc_name}', '{esc_lead}', '{t['email']}', '{esc_hash}', 'REGISTERED', TRUE)")

        f.write(",\n".join(val_rows))
        f.write("\nON CONFLICT (team_lead_email) DO UPDATE SET\n")
        f.write("  team_number = EXCLUDED.team_number,\n")
        f.write("  team_name = EXCLUDED.team_name,\n")
        f.write("  password_hash = EXCLUDED.password_hash,\n")
        f.write("  is_active = TRUE;\n\n")

        # Seed initial team_members (1 captain per team)
        f.write("-- Seed captain entries into team_members\n")
        f.write("INSERT INTO public.team_members (team_id, name, email)\n")
        f.write("SELECT id, team_lead_name, team_lead_email FROM public.teams\n")
        f.write("ON CONFLICT DO NOTHING;\n")

    print(f"[OK] Hashed SQL seed script saved to: {SQL_PATH}")
    print("Done!")


if __name__ == "__main__":
    main()
