import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { address } = req.query as { address?: string };
    if (!address) return res.status(400).json({ error: 'Missing address' });

    const upstream = `https://tokens.jup.ag/token/${encodeURIComponent(address)}`;
    const response = await fetch(upstream, { method: 'GET' });
    if (!response.ok) return res.status(response.status).json({ error: `Upstream error: ${response.status}` });

    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(data);
  } catch (e) {
    console.error('Jupiter token proxy error:', e);
    return res.status(500).json({ error: 'Failed to fetch token info' });
  }
}


