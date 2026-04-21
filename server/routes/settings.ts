import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/settings
router.get('/', async (_req: Request, res: Response) => {
  try {
    const settingsRows = await prisma.systemSetting.findMany();
    const settingsObject: Record<string, string> = {};
    settingsRows.forEach(s => {
      settingsObject[s.key] = s.value;
    });

    // แนบ initial data อื่นๆ ทับไปด้วยเพื่อ compatibility กับ Frontend เดิม (getInitialData)
    // แต่เพื่อความ clean ในระยะยาวควรแยก
    return res.json({ status: 'success', ...settingsObject });
  } catch (err: any) {
    return res.json({ status: 'error', message: err.message });
  }
});

// POST /api/settings
router.post('/', async (req: Request, res: Response) => {
  const { settings } = req.body; // ต้องเป็น object แบบ { KEY: VALUE }
  try {
    for (const [key, value] of Object.entries(settings)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
    return res.json({ status: 'success' });
  } catch (err: any) {
    return res.json({ status: 'error', message: err.message });
  }
});

// GET /api/users
router.get('/users', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, name: true, role: true }
    });
    // แมปให้มี rowIndex คืนค่าให้ Frontend ที่อาจเรียกใช้
    const mapped = users.map(u => ({ ...u, rowIndex: u.id }));
    return res.json(mapped);
  } catch (err: any) {
    return res.json({ status: 'error', message: err.message });
  }
});

export default router;
