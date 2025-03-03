import { auth } from '../../../lib/firebase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;
    const decodedToken = await auth.verifyIdToken(token);
    return res.status(200).json({ uid: decodedToken.uid });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
} 