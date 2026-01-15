#!/usr/bin/env node

import console from 'node:console';
import process from 'node:process';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { Buffer } from 'node:buffer';

const pbkdf2 = promisify(crypto.pbkdf2);

const ITERATIONS = 100000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';
const FORMAT = 'hex';

async function generateHash(password, salt) {
  const saltBuffer = Buffer.from(salt, FORMAT);
  const hash = await pbkdf2(password, saltBuffer, ITERATIONS, KEY_LENGTH, DIGEST);
  return hash.toString(FORMAT);
}

function generateSalt() {
  return crypto.randomBytes(32).toString(FORMAT);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node generate-password-hash.js <PASSWORD> [SALT]');
    process.exit(0);
  }

  const password = args[0];
  const salt = args[1] || generateSalt();
  if (!args[1]) {
    console.log('Generated random salt');
  }

  const hash = await generateHash(password, salt);
  console.log('\n=== PBKDF2 Password Hash ===');
  console.log(`Iterations: ${ITERATIONS}`);
  console.log(`Key Length: ${KEY_LENGTH} bytes`);
  console.log(`Digest: ${DIGEST}`);
  console.log('');
  console.log('Hash:');
  console.log(hash);
  console.log('');
  console.log('Salt:');
  console.log(salt);
  console.log('');
  console.log('------------------------------');
  console.log('Put the following secrets into your .dev.vars file:');
  console.log('');
  console.log('SECRET_ADMIN_PASSWORD_HASH="' + hash + '"');
  console.log('SECRET_ADMIN_PASSWORD_SALT="' + salt + '"');
  console.log('');
}

main().catch(console.error);
