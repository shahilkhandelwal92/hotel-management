import { apiClient } from './client';
import { RoomItem } from './types';

export async function fetchRooms(): Promise<RoomItem[]> {
  const response = await apiClient<{ rooms: RoomItem[] }>('/api/rooms');
  return response.rooms || [];
}
