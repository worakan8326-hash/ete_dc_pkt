export interface MaterialItem {
  rowIndex?: number;
  ประเภท: string;
  ยี่ห้อหรือรูปแบบ: string;
  รายการ: string;
  สภาพ: string;
  รายละเอียด: string;
  ขนาด: string;
  จำนวน: number;
}

export interface Transaction {
  [key: string]: any;
  เลขที่รายการ: string;
  "วัน-เวลา": string;
  ผู้ทำรายการ: string;
  สถานะ: string;
  ประเภท: string;
  "ยี่ห้อ/รูปแบบ"?: string;
  "ยี่ห้อ/รายการ"?: string;
  รายการ: string;
  สภาพ: string;
  รายละเอียด: string;
  ขนาด: string;
  จำนวน: number;
  CV: string;
  เขตการทำงาน?: string;
  จัดส่งโดย: string;
  กำหนดส่ง: string;
  หมายเหตุ: string;
}

export interface User {
  username: string;
  name: string;
  role: string;
}

export interface Zone {
  rowIndex?: number;
  name: string;
  description?: string;
}

export interface Customer {
  rowIndex?: number;
  cv: string;
  name: string;
  phone: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  zipcode: string;
  lat: string;
  lng: string;
}
