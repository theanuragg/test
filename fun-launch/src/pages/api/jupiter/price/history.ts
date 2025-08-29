import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { ids, vsToken = 'USDC', days = '7' } = req.query as { ids?: string; vsToken?: string; days?: string };
    if (!ids) return res.status(400).json({ error: 'Missing ids' });

    const upstream = `https://price.jup.ag/v6/price/history?ids=${encodeURIComponent(ids)}&vsToken=${encodeURIComponent(vsToken)}&days=${encodeURIComponent(days)}`;
    const response = await fetch(upstream, { method: 'GET' });
    if (!response.ok) return res.status(response.status).json({ error: `Upstream error: ${response.status}` });

    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    return res.status(200).json(data);
  } catch (e) {
    console.error('Jupiter price history proxy error:', e);
    return res.status(500).json({ error: 'Failed to fetch price history' });
  }
}


