import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

export async function getVendorUser(request) {
  try {
    // Try cookie first
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('vendor_token')?.value;

    if (authCookie) {
      const { payload } = await jwtVerify(authCookie, JWT_SECRET);
      if (payload.type === 'vendor') {
        return payload;
      }
    }

    // Try Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { payload } = await jwtVerify(token, JWT_SECRET);
      if (payload.type === 'vendor') {
        return payload;
      }
    }

    return null;
  } catch (err) {
    console.error('Vendor auth error:', err);
    return null;
  }
}
