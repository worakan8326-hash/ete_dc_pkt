"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const xlsx = __importStar(require("xlsx"));
const path_1 = __importDefault(require("path"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function importItems() {
    return __awaiter(this, void 0, void 0, function* () {
        const filePath = path_1.default.join(__dirname, '..', 'Data_ete_pk_dc_ims (3).xlsx');
        console.log(`📖 Loading file: ${filePath}`);
        try {
            const workbook = xlsx.readFile(filePath);
            const sheetName = 'data';
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) {
                throw new Error(`ไม่พบแท็บ "${sheetName}" ในไฟล์ Excel`);
            }
            // Convert to JSON
            const rows = xlsx.utils.sheet_to_json(sheet);
            console.log(`📊 Found ${rows.length} rows in Excel.`);
            // 1. Clear old data (Clear in order to avoid FK constraints)
            console.log('🗑 Clearing all transaction & history data for a fresh start...');
            yield prisma.auditLog.deleteMany({});
            yield prisma.transaction.deleteMany({});
            yield prisma.job.deleteMany({});
            yield prisma.masterItem.deleteMany({});
            // 2. Prepare mapping
            // Excel Header -> Prisma field
            const mapping = {
                'ประเภท': 'category',
                'ยี่ห้อ/รูปแบบ': 'brand',
                'ยี่ห้อ': 'brand',
                'ยี่ห้อหรือรูปแบบ': 'brand',
                'รายการ': 'item_name',
                'สภาพ': 'condition',
                'รายละเอียดเพิ่มเติม': 'details',
                'รายละเอียด': 'details',
                'ขนาด': 'size',
                'ยอดคงเหลือปัจจุบัน': 'stock_qty',
                'สต็อก': 'stock_qty',
                'จำนวน': 'stock_qty'
            };
            const newItems = rows.map((row) => {
                const item = {
                    category: '',
                    brand: '',
                    item_name: '',
                    condition: '',
                    details: '',
                    size: '',
                    stock_qty: 0
                };
                for (const [key, value] of Object.entries(row)) {
                    const field = mapping[key.trim()];
                    if (field) {
                        if (field === 'stock_qty') {
                            item[field] = parseInt(String(value || 0)) || 0;
                        }
                        else {
                            item[field] = String(value || '').trim();
                        }
                    }
                }
                return item;
            }).filter(it => it.category || it.item_name); // Filter out empty rows
            console.log(`🚀 Inserting ${newItems.length} items into MasterItem...`);
            // Use createMany for speed
            yield prisma.masterItem.createMany({
                data: newItems,
                skipDuplicates: true
            });
            console.log('✅ Import Completed successfully!');
        }
        catch (err) {
            console.error('❌ Import Failed:', err.message);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
importItems();
