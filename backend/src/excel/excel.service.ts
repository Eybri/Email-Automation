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
            return { headers: [], rows: [] };
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

        return { headers, rows: data };
    }
}
