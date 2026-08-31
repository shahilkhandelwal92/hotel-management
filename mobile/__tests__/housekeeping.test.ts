const mockStore: Record<string, string> = {
  stayos_auth_token: 'mock-valid-housekeeping-token',
};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockStore[key] || null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    delete mockStore[key];
  }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { apiClient } from '../src/api/client';
import { HousekeepingTask, LostAndFoundItem } from '../src/api/types';

describe('Mobile Housekeeping Operational Workflows', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000';
  });

  it('fetches room task board list with filter criteria', async () => {
    const mockTasks: HousekeepingTask[] = [
      {
        id: 'tsk_101',
        hotelId: 'htl_1',
        roomNumber: '101',
        taskType: 'Clean',
        priority: 'High',
        status: 'Pending',
        checklist: [
          { item: 'Change bed sheets', done: false },
          { item: 'Clean bathroom', done: false },
        ],
        room: {
          id: 'rm_101',
          number: '101',
          type: 'Deluxe',
          floor: 1,
          status: 'Dirty',
        },
        assignedTo: { id: 'usr_hk_1', name: 'Housekeeper Sunita' },
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ tasks: mockTasks }),
    });

    const response = await apiClient<{ tasks: HousekeepingTask[] }>('/api/housekeeping?status=Pending&priority=High');

    expect(response.tasks.length).toBe(1);
    expect(response.tasks[0].roomNumber).toBe('101');
    expect(response.tasks[0].room?.status).toBe('Dirty');
    expect(response.tasks[0].checklist?.length).toBe(2);
  });

  it('mutates task status to InProgress when cleaning begins', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        task: {
          id: 'tsk_101',
          status: 'InProgress',
          roomNumber: '101',
        },
      }),
    });

    const result = await apiClient<{ task: any }>('/api/housekeeping', {
      method: 'PUT',
      body: { id: 'tsk_101', status: 'InProgress' },
    });

    expect(result.task.status).toBe('InProgress');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const bodySent = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(bodySent.status).toBe('InProgress');
  });

  it('completes cleaning and marks room Clean via authoritative backend', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        task: {
          id: 'tsk_101',
          status: 'Completed',
          room: { id: 'rm_101', status: 'Vacant' },
        },
      }),
    });

    const result = await apiClient<{ task: any }>('/api/housekeeping', {
      method: 'PUT',
      body: { id: 'tsk_101', status: 'Completed' },
    });

    expect(result.task.status).toBe('Completed');
    expect(result.task.room.status).toBe('Vacant');
  });

  it('records a new Lost & Found guest article', async () => {
    const mockCreatedItem: LostAndFoundItem = {
      id: 'lnf_99',
      hotelId: 'htl_1',
      itemName: 'Gold Wristwatch',
      description: 'Found on bedside nightstand',
      foundLocation: 'Room 204',
      foundByName: 'Housekeeper Sunita',
      status: 'Found',
      estimatedValue: 15000,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      json: async () => ({ item: mockCreatedItem }),
    });

    const result = await apiClient<{ item: LostAndFoundItem }>('/api/housekeeping/lost-found', {
      method: 'POST',
      body: {
        itemName: 'Gold Wristwatch',
        description: 'Found on bedside nightstand',
        foundLocation: 'Room 204',
        foundByName: 'Housekeeper Sunita',
        estimatedValue: 15000,
      },
    });

    expect(result.item.itemName).toBe('Gold Wristwatch');
    expect(result.item.status).toBe('Found');
    expect(result.item.estimatedValue).toBe(15000);
  });
});
