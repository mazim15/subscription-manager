// This is a client-safe file for auth operations

export async function verifyToken(token: string) {
  try {
    const response = await fetch('/api/auth/verify-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to verify token');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error verifying token:', error);
    throw error;
  }
} 