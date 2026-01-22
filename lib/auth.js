export const runtime = 'nodejs';

const bcrypt = require('bcryptjs');
const jose = require('jose');

const secretKey = new TextEncoder().encode(process.env.JWT_SECRET);

export async function createToken(payload) {
  const token = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secretKey);
  return token;
}

export async function verifyToken(token) {
  try {
    const { payload } = await jose.jwtVerify(token, secretKey);
    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export async function comparePasswords(plain, hashed) {
  return bcrypt.compareSync(plain, hashed);
}
