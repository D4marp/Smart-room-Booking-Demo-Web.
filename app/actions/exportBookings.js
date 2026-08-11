'use server';

import { writeFile, utils } from 'xlsx';
import { buildFeedbackExportRows } from '../../lib/feedback';

export async function exportHistoryToExcelServer(bookings, rooms = []) {
  try {
    const { rows: exportData } = buildFeedbackExportRows(bookings, rooms);

    const ws = utils.json_to_sheet(exportData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Booking History');

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `booking-history-${timestamp}.xlsx`;

    writeFile(wb, filename);
    
    return {
      success: true,
      filename: filename,
      message: 'Data berhasil diexport ke Excel.',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Gagal export data ke Excel',
    };
  }
}
