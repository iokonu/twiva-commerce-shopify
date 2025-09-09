import { setProductCommission, setCollectionCommission, setCategoryCommission, removeCommission } from '../../lib/commissions';

export default async function handler(req, res) {
  const { shop } = req.query;

  if (req.method === 'POST') {
    try {
      const { type, id, commission, commissionType = 'percentage', currency } = req.body;

      const commissionData = { commission, commissionType, currency };
      
      if (type === 'product') {
        const result = await setProductCommission(shop, id, commissionData);
        return res.json(result);
      } else if (type === 'collection') {
        const result = await setCollectionCommission(shop, id, commissionData);
        return res.json(result);
      } else if (type === 'category') {
        const result = await setCategoryCommission(shop, id, commissionData);
        return res.json(result);
      }

      return res.status(400).json({ error: 'Invalid type' });
    } catch (error) {
      console.error('Set commission error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        requestBody: req.body
      });
      return res.status(500).json({ error: 'Failed to set commission', details: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { type, id } = req.body;
      await removeCommission(shop, type, id);
      return res.json({ success: true });
    } catch (error) {
      console.error('Remove commission error:', error);
      return res.status(500).json({ error: 'Failed to remove commission' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}