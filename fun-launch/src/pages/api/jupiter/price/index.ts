import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { ids, vsToken = 'USDC' } = req.query as { ids?: string; vsToken?: string };
    if (!ids) return res.status(400).json({ error: 'Missing ids' });

    const upstream = `https://price.jup.ag/v6/price?ids=${encodeURIComponent(ids)}&vsToken=${encodeURIComponent(vsToken)}`;
    const response = await fetch(upstream, { method: 'GET' });
    if (!response.ok) return res.status(response.status).json({ error: `Upstream error: ${response.status}` });

    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    return res.status(200).json(data);
  } catch (e) {
    console.error('Jupiter price proxy error:', e);
    return res.status(500).json({ error: 'Failed to fetch price' });
  }
}


