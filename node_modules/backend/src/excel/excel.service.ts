import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

@Injectable()
export class ExcelService {
    parseExcel(buffer: Buffer) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Use defval to ensure empty cells are included as empty strings
        // instead of being omitted, which would cause missing columns
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[];

        if (data.length === 0) {
            return { headers: [], rows: [], emailColumn: null };
        }

        // Get headers from the full set of keys across ALL rows
        // to catch columns that might only appear in some rows
        const headerSet = new Set<string>();
        for (const row of data) {
            for (const key of Object.keys(row)) {
                headerSet.add(key);
            }
        }
        const headers = Array.from(headerSet);
        const emailColumn = this.findEmailColumn(headers, data);

        return { headers, rows: data, emailColumn };
    }

    private findEmailColumn(headers: string[], rows: any[]): string | null {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // 1. Check for exact matches (case-insensitive)
        const exactMatches = ['email', 'e-mail', 'mailto', 'recipient', 'to', 'address', 'email address'];
        for (const header of headers) {
            const h = header.toLowerCase().trim();
            if (exactMatches.includes(h)) return header;
        }

        // 2. Check for partial matches
        for (const header of headers) {
            const h = header.toLowerCase();
            if (h.includes('email') || h.includes('mail')) return header;
        }

        // 3. Test content of the first few rows
        if (rows.length > 0) {
            const samples = rows.slice(0, 10);
            for (const header of headers) {
                const isEmailColumn = samples.some(row => {
                    const val = String(row[header] || '').trim();
                    return emailRegex.test(val);
                });
                if (isEmailColumn) return header;
            }
        }

        return null;
    }
}
