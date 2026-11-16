/**
 * Creates (or resets the password of) a CertiVault administrator.
 *
 * Usage:
 *   npm run create-admin -- --name "Jane Admin" --email admin@example.com
 *   npm run create-admin -- --email admin@example.com --reset     # change password
 *
 * The password is typed at a hidden prompt (or read from ADMIN_PASSWORD for
 * non-interactive use). It is hashed with bcrypt and never stored in plain text.
 */
import readline from 'readline';
import bcrypt from 'bcryptjs';
import { createAdmin, findAdminByEmail, updateAdminPassword } from '../src/models/adminModel';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      if (!muted) process.stdout.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
    muted = hidden;
  });
}

async function main() {
  const reset = process.argv.includes('--reset');
  const email = (arg('email') ?? process.env.ADMIN_EMAIL ?? (await ask('Admin email: '))).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error('A valid email is required');

  const existing = findAdminByEmail(email);
  if (existing && !reset) {
    console.log(`An administrator with email ${email} already exists. Use --reset to change the password.`);
    return;
  }
  if (!existing && reset) throw new Error(`No administrator with email ${email}`);

  const name = existing?.name ?? arg('name') ?? process.env.ADMIN_NAME ?? (await ask('Admin full name: '));
  if (name.length < 2) throw new Error('Name must be at least 2 characters');

  let password = process.env.ADMIN_PASSWORD ?? '';
  if (!password) {
    password = await ask('Password (min 10 characters, hidden): ', true);
    const confirm = await ask('Confirm password: ', true);
    if (password !== confirm) throw new Error('Passwords do not match');
  }
  if (password.length < 10) throw new Error('Password must be at least 10 characters');

  const passwordHash = await bcrypt.hash(password, 12);
  if (existing) {
    updateAdminPassword(existing.id, passwordHash);
    console.log(`✔ Password updated for ${email}`);
  } else {
    const admin = createAdmin({ name, email, passwordHash });
    console.log(`✔ Administrator created: ${admin.name} <${admin.email}>`);
  }
}

main().catch((err) => {
  console.error(`✖ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
