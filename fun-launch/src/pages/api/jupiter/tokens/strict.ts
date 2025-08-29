import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const upstream = 'https://tokens.jup.ag/strict';
    const response = await fetch(upstream, { method: 'GET' });
    if (!response.ok) return res.status(response.status).json({ error: `Upstream error: ${response.status}` });

    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch (e) {
    console.error('Jupiter strict tokens proxy error:', e);
    return res.status(500).json({ error: 'Failed to fetch strict tokens' });
  }
}


