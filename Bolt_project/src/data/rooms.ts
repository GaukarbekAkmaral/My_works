import type { Room } from '../lib/availability';

export const ROOMS: Room[] = [
  {
    id: 'A101',
    name: 'Room A101',
    blocked: false,
    bookings: [{ start: 600, end: 660 }],
    capacity: 20,
    equipment: ['Wi-Fi', 'Projector', 'Whiteboard'],
  },
  {
    id: 'B202',
    name: 'Room B202',
    blocked: true,
    bookings: [],
    capacity: 12,
    equipment: ['Wi-Fi', 'Projector'],
  },
  {
    id: 'C303',
    name: 'Room C303',
    blocked: false,
    bookings: [],
    capacity: 30,
    equipment: ['Wi-Fi', 'Projector', 'Whiteboard', 'Video conferencing'],
  },
  {
    id: 'D404',
    name: 'Room D404',
    blocked: false,
    bookings: [{ start: 900, end: 960 }],
    capacity: 8,
    equipment: ['Wi-Fi', 'Whiteboard'],
  },
];