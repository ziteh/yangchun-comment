#!/usr/bin/env node

import crypto from 'node:crypto';
import process from 'node:process';
import console from 'node:console';

const bytes = parseInt(process.argv[2]) || 32; // Default to 32 bytes if not provided

if (isNaN(bytes) || bytes <= 0) {
  console.error('Error: please provide a valid positive integer for the number of bytes.');
  process.exit(1);
}
if (bytes < 32) {
  console.error('Error: for security reasons, please use at least 32 bytes.');
  process.exit(1);
}
if (bytes > 1024) {
  console.error(
    'Warning: the number of bytes is quite large, please make sure this is intentional.',
  );
}

try {
  const randomBytes = crypto.randomBytes(bytes);
  const hexString = randomBytes.toString('hex');

  console.log(hexString);
} catch (error) {
  console.error('Error generating random bytes:', error.message);
  process.exit(1);
}
