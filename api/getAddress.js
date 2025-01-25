import axios from 'axios';

export default async function handler(req, res) {
  const { lng, lat } = req.query;
  const KEY = process.env.AMAP_KEY;
  const SECRET = process.env.AMAP_SECRET;

  try {
    const response = await axios.get(
      `https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${KEY}`
    );
    
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: '地址获取失败' });
  }
} 