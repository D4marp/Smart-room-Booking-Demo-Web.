import { describe, it, expect } from 'vitest';
import {
  getRoomFacilitiesForBooking,
  getSelectedComplaintSet,
  getFeedbackLabel,
  getFeedbackExportColumns,
  buildFeedbackExportRows,
  filterBookingsByFeedbackPeriod,
} from './feedback';

const rooms = [
  { id: 'room-1', amenities: ['Proyektor', 'AC', 'proyektor'] },
  { id: 'room-2', amenities: [] },
];

describe('getRoomFacilitiesForBooking', () => {
  it('returns deduplicated, trimmed amenities for the booked room', () => {
    expect(getRoomFacilitiesForBooking({ roomId: 'room-1' }, rooms)).toEqual(['Proyektor', 'AC']);
  });

  it('returns an empty list when room is not found', () => {
    expect(getRoomFacilitiesForBooking({ roomId: 'missing' }, rooms)).toEqual([]);
  });

  it('returns an empty list when booking has no roomId', () => {
    expect(getRoomFacilitiesForBooking({}, rooms)).toEqual([]);
  });
});

describe('getSelectedComplaintSet', () => {
  it('lowercases complaint items into a set', () => {
    const booking = { feedback: { complaintItems: ['AC', 'Proyektor', 'ac'] } };
    expect(getSelectedComplaintSet(booking)).toEqual(new Set(['ac', 'proyektor']));
  });

  it('returns an empty set when there is no feedback', () => {
    expect(getSelectedComplaintSet({})).toEqual(new Set());
  });
});

describe('getFeedbackLabel', () => {
  it('returns "-" when there is no feedback', () => {
    expect(getFeedbackLabel({})).toBe('-');
  });

  it('returns "Puas" for satisfied bookings', () => {
    expect(getFeedbackLabel({ feedback: { satisfactionLevel: 'satisfied' } })).toBe('Puas');
  });

  it('returns "Tidak Puas" for any other satisfaction level', () => {
    expect(getFeedbackLabel({ feedback: { satisfactionLevel: 'unsatisfied' } })).toBe('Tidak Puas');
  });
});

describe('getFeedbackExportColumns', () => {
  it('collects facility columns from booked rooms, falling back to all rooms if none matched', () => {
    const bookings = [{ roomId: 'room-1' }];
    expect(getFeedbackExportColumns(bookings, rooms)).toEqual(['Proyektor', 'AC']);
  });

  it('falls back to all room amenities when no bookings reference a room', () => {
    expect(getFeedbackExportColumns([], rooms)).toEqual(['Proyektor', 'AC']);
  });
});

describe('buildFeedbackExportRows', () => {
  it('builds one row per booking with facility columns marked', () => {
    const bookings = [
      {
        roomId: 'room-1',
        roomName: 'Ruang A',
        userName: 'Budi',
        feedback: { satisfactionLevel: 'unsatisfied', complaintItems: ['AC'] },
      },
    ];

    const { rows, facilityColumns } = buildFeedbackExportRows(bookings, rooms);

    expect(facilityColumns).toEqual(['Proyektor', 'AC']);
    expect(rows).toHaveLength(1);
    expect(rows[0]['Nama Ruangan']).toBe('Ruang A');
    expect(rows[0]['Puas / Tidak Puas']).toBe('Tidak Puas');
    expect(rows[0].AC).toBe('Keluhan');
    expect(rows[0].Proyektor).toBe('✓');
  });
});

describe('filterBookingsByFeedbackPeriod', () => {
  it('filters bookings with feedback matching the given year/month', () => {
    const matching = new Date(2026, 0, 15).getTime();
    const other = new Date(2025, 5, 1).getTime();

    const bookings = [
      { feedback: { createdAt: matching } },
      { feedback: { createdAt: other } },
      {},
    ];

    const result = filterBookingsByFeedbackPeriod(bookings, { year: '2026', month: '1' });
    expect(result).toHaveLength(1);
    expect(result[0].feedback.createdAt).toBe(matching);
  });

  it('returns an empty array when no year/month provided and everything has feedback', () => {
    const bookings = [{ feedback: { createdAt: Date.now() } }];
    expect(filterBookingsByFeedbackPeriod(bookings)).toHaveLength(1);
  });
});
