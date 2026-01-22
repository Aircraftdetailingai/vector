export async function createToken(payload) {
  const { SignJWT } = await import('jose');
  const secretKey = new TextEncoder().encode(process.env.JWT_SECRET);
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function verifyToken(token) {
  const { jwtVerify } = await import('jose');
  const secretKey = new TextEncoder().encode(process.env.JWT_SECRET);
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(password) {
  const bcrypt = (await import('bcryptjs')).default;
  return bcrypt.hashSync(password, 10);
}

export async function comparePasswords(plain, hashed) {
  const bcrypt = (await import('bcryptjs')).default;
  return bcrypt.compareSync(plain, hashed);
}
