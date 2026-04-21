"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const prisma_1 = __importDefault(require("./lib/prisma")); // Initialize prisma here globally
const auth_1 = __importDefault(require("./routes/auth"));
const items_1 = __importDefault(require("./routes/items"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const customers_1 = __importDefault(require("./routes/customers"));
const zones_1 = __importDefault(require("./routes/zones"));
const settings_1 = __importDefault(require("./routes/settings"));
const warehouses_1 = __importDefault(require("./routes/warehouses"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use((_req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});
app.use(express_1.default.json({ limit: '10mb' })); // Support base64 image payload
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/items', items_1.default);
app.use('/api/transactions', transactions_1.default);
app.use('/api/customers', customers_1.default);
app.use('/api/zones', zones_1.default);
app.use('/api/settings', settings_1.default);
app.use('/api/warehouses', warehouses_1.default);
// Compatibility fallback for Frontend initial data load logic that maps to multiple things
app.get('/api/initialData', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [items, transactions, customers, zones, settingsList, permissionsList, warehouses] = yield Promise.all([
            prisma_1.default.masterItem.findMany({ include: { warehouse_stocks: true } }),
            prisma_1.default.transaction.findMany({ include: { item: true, job: { include: { customer: true } }, operator: true }, orderBy: { created_at: 'desc' }, take: 500 }),
            prisma_1.default.customer.findMany(),
            prisma_1.default.zone.findMany(),
            prisma_1.default.systemSetting.findMany(),
            prisma_1.default.rolePermission.findMany(),
            prisma_1.default.warehouse.findMany({ include: { stocks: true } })
        ]);
        let settings = {};
        settingsList.forEach((s) => settings[s.key] = s.value);
        let permissions = {};
        permissionsList.forEach((p) => permissions[p.role] = p.permissions);
        // Map items exactly same as frontend expectation
        const mappedItems = items.map((i) => {
            var _a, _b, _c, _d;
            // Calculate totals from warehouse stocks
            const totalStock = i.warehouse_stocks.reduce((acc, cur) => acc + cur.stock_qty, 0);
            const totalRepair = i.warehouse_stocks.reduce((acc, cur) => acc + cur.repair_qty, 0);
            const totalScrap = i.warehouse_stocks.reduce((acc, cur) => acc + cur.scrap_qty, 0);
            const totalLost = i.warehouse_stocks.reduce((acc, cur) => acc + cur.lost_qty, 0);
            const totalQuarantine = i.warehouse_stocks.reduce((acc, cur) => acc + (cur.quarantine_qty || 0), 0);
            const totalTransit = i.warehouse_stocks.reduce((acc, cur) => acc + (cur.transit_qty || 0), 0);
            return {
                id: i.id, // Primary ID
                rowIndex: i.id,
                ประเภท: i.category,
                ยี่ห้อหรือรูปแบบ: (_a = i.brand) !== null && _a !== void 0 ? _a : '',
                รายการ: (i.item_name && i.item_name.trim()) ? i.item_name : i.category,
                สภาพ: (_b = i.condition) !== null && _b !== void 0 ? _b : '',
                รายละเอียด: (_c = i.details) !== null && _c !== void 0 ? _c : '',
                ขนาด: (_d = i.size) !== null && _d !== void 0 ? _d : '',
                จำนวน: totalStock,
                repair_qty: totalRepair,
                scrap_qty: totalScrap,
                lost_qty: totalLost,
                quarantine_qty: totalQuarantine,
                transit_qty: totalTransit,
                warehouse_stocks: i.warehouse_stocks.map((ws) => ({
                    warehouseId: ws.warehouse_id,
                    stock: ws.stock_qty,
                    repair: ws.repair_qty,
                    scrap: ws.scrap_qty,
                    lost: ws.lost_qty,
                    quarantine: ws.quarantine_qty || 0,
                    transit: ws.transit_qty || 0
                }))
            };
        });
        // Map txns 
        const mappedTxns = transactions.map((t) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8;
            const cv = (_g = (_e = (_c = (_b = (_a = t.job) === null || _a === void 0 ? void 0 : _a.customer) === null || _b === void 0 ? void 0 : _b.cv) !== null && _c !== void 0 ? _c : (_d = t.job) === null || _d === void 0 ? void 0 : _d.customer_cv) !== null && _e !== void 0 ? _e : (_f = t.job) === null || _f === void 0 ? void 0 : _f.cv) !== null && _g !== void 0 ? _g : '';
            return {
                id: t.id.toString(),
                item_id: t.item_id, // 👈 Added for frontend matching
                job_id: t.job_id || '',
                เลขที่รายการ: (_h = t.job_id) !== null && _h !== void 0 ? _h : `TXN-${t.id}`,
                "วัน-เวลา": t.created_at.toISOString(),
                ผู้ทำรายการ: (_l = (_k = (_j = t.operator) === null || _j === void 0 ? void 0 : _j.name) !== null && _k !== void 0 ? _k : t.delivery_by) !== null && _l !== void 0 ? _l : 'Unknown',
                สถานะ: t.action_type,
                ประเภท: t.item.category,
                "ยี่ห้อ/รูปแบบ": (_m = t.item.brand) !== null && _m !== void 0 ? _m : '',
                รายการ: (t.item.item_name && t.item.item_name.trim()) ? t.item.item_name : t.item.category,
                สภาพ: (_o = t.item.condition) !== null && _o !== void 0 ? _o : '',
                รายละเอียด: (_p = t.item.details) !== null && _p !== void 0 ? _p : '',
                ขนาด: (_q = t.item.size) !== null && _q !== void 0 ? _q : '',
                จำนวน: t.quantity,
                CV: cv,
                "สาเหตุการคืน": (_r = t.return_reason) !== null && _r !== void 0 ? _r : '',
                "สภาพตู้": (_s = t.cabinet_status) !== null && _s !== void 0 ? _s : '',
                "เหตุผลการยกเลิก": (_t = t.cancel_reason) !== null && _t !== void 0 ? _t : '',
                serial_number: (_u = t.serial_number) !== null && _u !== void 0 ? _u : '',
                "ผู้แจ้ง": ((_v = t.job) === null || _v === void 0 ? void 0 : _v.notifier) || ((_w = t.operator) === null || _w === void 0 ? void 0 : _w.name) || '',
                "วันที่แจ้ง": ((_x = t.job) === null || _x === void 0 ? void 0 : _x.notification_date) ? t.job.notification_date.toISOString() : '',
                "จัดส่งโดย": (_0 = (_z = (_y = t.job) === null || _y === void 0 ? void 0 : _y.delivery_by) !== null && _z !== void 0 ? _z : t.delivery_by) !== null && _0 !== void 0 ? _0 : 'N/A',
                "เขตการทำงาน": (_1 = t.zone_name) !== null && _1 !== void 0 ? _1 : '',
                "รูปภาพประกอบ": (_2 = t.image_url) !== null && _2 !== void 0 ? _2 : '',
                lat: (_3 = t.lat) !== null && _3 !== void 0 ? _3 : '',
                lng: (_4 = t.lng) !== null && _4 !== void 0 ? _4 : '',
                distance_warning: (_5 = t.distance_warning) !== null && _5 !== void 0 ? _5 : '',
                หมายเหตุ: (_8 = (_7 = (_6 = t.job) === null || _6 === void 0 ? void 0 : _6.note) !== null && _7 !== void 0 ? _7 : t.return_reason) !== null && _8 !== void 0 ? _8 : ''
            };
        });
        const mappedCustomers = customers.map((c) => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            return ({
                rowIndex: c.cv, cv: c.cv, name: c.name, phone: (_a = c.phone) !== null && _a !== void 0 ? _a : '', address: (_b = c.address) !== null && _b !== void 0 ? _b : '', subdistrict: (_c = c.sub_district) !== null && _c !== void 0 ? _c : '', district: (_d = c.district) !== null && _d !== void 0 ? _d : '', province: (_e = c.province) !== null && _e !== void 0 ? _e : '', zipcode: (_f = c.zipcode) !== null && _f !== void 0 ? _f : '', lat: String((_g = c.latitude) !== null && _g !== void 0 ? _g : ''), lng: String((_h = c.longitude) !== null && _h !== void 0 ? _h : '')
            });
        });
        return res.json({
            status: 'success',
            items: mappedItems,
            transactions: mappedTxns,
            customers: mappedCustomers,
            zones: zones.map((z) => ({ name: z.name, rowIndex: z.name })),
            warehouses: warehouses.map((w) => ({
                id: w.id,
                name: w.name,
                stocks: w.stocks.map((s) => ({
                    itemId: s.item_id,
                    stock: s.stock_qty,
                    repair: s.repair_qty,
                    scrap: s.scrap_qty,
                    quarantine: s.quarantine_qty,
                    lost: s.lost_qty,
                    transit: s.transit_qty
                }))
            })),
            settings,
            permissions
        });
    }
    catch (err) {
        console.error(err);
        return res.json({ status: 'error', message: err.message });
    }
}));
// Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
});
