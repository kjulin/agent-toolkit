import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readLogs, createReadLogs } from '../src/core/read_logs';
import { Logging } from '@google-cloud/logging';

// Mock @google-cloud/logging
vi.mock('@google-cloud/logging', () => {
  const mockGetEntries = vi.fn();

  return {
    Logging: vi.fn().mockImplementation(() => ({
      getEntries: mockGetEntries,
    })),
    __mockGetEntries: mockGetEntries,
  };
});

describe('readLogs', () => {
  let mockGetEntries: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Access the mock function through the module
    mockGetEntries = (Logging as any).mock.results[0]?.value?.getEntries || vi.fn();
    // Update the mock implementation to use the same function
    (Logging as any).mockImplementation(() => ({
      getEntries: mockGetEntries,
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful operations', () => {
    it('should read logs for a Cloud Run service', async () => {
      const mockLogs = [
        {
          metadata: {
            timestamp: '2024-01-01T10:00:00.000Z',
            severity: 'INFO',
            resource: {
              type: 'cloud_run_revision',
              labels: {
                service_name: 'my-service',
              },
            },
          },
          data: {
            textPayload: 'Application started',
          },
        },
        {
          metadata: {
            timestamp: '2024-01-01T10:01:00.000Z',
            severity: 'ERROR',
            resource: {
              type: 'cloud_run_revision',
              labels: {
                service_name: 'my-service',
              },
            },
          },
          data: {
            textPayload: 'Error occurred',
          },
        },
      ];

      mockGetEntries.mockResolvedValue([mockLogs]);

      const result = await readLogs({
        service: 'my-service',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.entries).toHaveLength(2);
      expect(result.data?.count).toBe(2);
      expect(result.data?.service).toBe('my-service');
      expect(result.data?.entries[0].message).toBe('Application started');
      expect(result.data?.entries[1].severity).toBe('ERROR');
    });

    it('should include project in the result when specified', async () => {
      mockGetEntries.mockResolvedValue([[]]);

      const result = await readLogs({
        service: 'my-service',
        project: 'my-project',
      });

      expect(result.success).toBe(true);
      expect(result.data?.project).toBe('my-project');
      expect(Logging).toHaveBeenCalledWith({ projectId: 'my-project' });
    });

    it('should handle logs with jsonPayload', async () => {
      const mockLogs = [
        {
          metadata: {
            timestamp: '2024-01-01T10:00:00.000Z',
            severity: 'INFO',
            resource: {
              type: 'cloud_run_revision',
            },
          },
          data: {
            jsonPayload: {
              message: 'JSON log message',
              userId: '123',
              action: 'login',
            },
          },
        },
      ];

      mockGetEntries.mockResolvedValue([mockLogs]);

      const result = await readLogs({
        service: 'my-service',
      });

      expect(result.success).toBe(true);
      expect(result.data?.entries[0].message).toBe('JSON log message');
      expect(result.data?.entries[0].jsonPayload).toBeDefined();
      expect(result.data?.entries[0].jsonPayload?.userId).toBe('123');
    });

    it('should handle empty log results', async () => {
      mockGetEntries.mockResolvedValue([[]]);

      const result = await readLogs({
        service: 'my-service',
      });

      expect(result.success).toBe(true);
      expect(result.data?.entries).toHaveLength(0);
      expect(result.data?.count).toBe(0);
    });

    it('should handle logs with string data', async () => {
      const mockLogs = [
        {
          metadata: {
            timestamp: '2024-01-01T10:00:00.000Z',
            severity: 'INFO',
          },
          data: 'Simple string message',
        },
      ];

      mockGetEntries.mockResolvedValue([mockLogs]);

      const result = await readLogs({
        service: 'my-service',
      });

      expect(result.success).toBe(true);
      expect(result.data?.entries[0].message).toBe('Simple string message');
    });
  });

  describe('filter building', () => {
    it('should call getEntries with severity filter', async () => {
      mockGetEntries.mockResolvedValue([[]]);

      await readLogs({
        service: 'my-service',
        severity: 'ERROR',
      });

      expect(mockGetEntries).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.stringContaining('severity>=ERROR'),
        })
      );
    });

    it('should call getEntries with time range', async () => {
      mockGetEntries.mockResolvedValue([[]]);

      await readLogs({
        service: 'my-service',
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-02T00:00:00Z',
      });

      expect(mockGetEntries).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.stringMatching(/timestamp>="2024-01-01T00:00:00Z".*AND.*timestamp<="2024-01-02T00:00:00Z"/),
        })
      );
    });

    it('should call getEntries with region filter', async () => {
      mockGetEntries.mockResolvedValue([[]]);

      await readLogs({
        service: 'my-service',
        region: 'us-central1',
      });

      expect(mockGetEntries).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.stringContaining('resource.labels.location="us-central1"'),
        })
      );
    });

    it('should call getEntries with custom filter', async () => {
      mockGetEntries.mockResolvedValue([[]]);

      await readLogs({
        service: 'my-service',
        filter: 'labels.user_id="123"',
      });

      expect(mockGetEntries).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.stringContaining('labels.user_id="123"'),
        })
      );
    });

    it('should call getEntries with limit', async () => {
      mockGetEntries.mockResolvedValue([[]]);

      await readLogs({
        service: 'my-service',
        limit: 50,
      });

      expect(mockGetEntries).toHaveBeenCalledWith(
        expect.objectContaining({
          pageSize: 50,
        })
      );
    });

    it('should use default limit of 100 when not specified', async () => {
      mockGetEntries.mockResolvedValue([[]]);

      await readLogs({
        service: 'my-service',
      });

      expect(mockGetEntries).toHaveBeenCalledWith(
        expect.objectContaining({
          pageSize: 100,
        })
      );
    });

    it('should call getEntries with ascending order', async () => {
      mockGetEntries.mockResolvedValue([[]]);

      await readLogs({
        service: 'my-service',
        order: 'asc',
      });

      expect(mockGetEntries).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: 'timestamp asc',
        })
      );
    });

    it('should call getEntries with descending order by default', async () => {
      mockGetEntries.mockResolvedValue([[]]);

      await readLogs({
        service: 'my-service',
      });

      expect(mockGetEntries).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: 'timestamp desc',
        })
      );
    });
  });

  describe('error cases', () => {
    it('should fail when service name is not provided', async () => {
      const result = await readLogs({
        service: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Service name is required');
    });

    it('should handle authentication error', async () => {
      const error: any = new Error('UNAUTHENTICATED');
      error.code = 16;
      mockGetEntries.mockRejectedValue(error);

      const result = await readLogs({
        service: 'my-service',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not authenticated with Google Cloud');
    });

    it('should handle permission denied error', async () => {
      const error: any = new Error('Permission denied');
      error.code = 7;
      mockGetEntries.mockRejectedValue(error);

      const result = await readLogs({
        service: 'my-service',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });

    it('should handle not found error', async () => {
      const error: any = new Error('Not found');
      error.code = 5;
      mockGetEntries.mockRejectedValue(error);

      const result = await readLogs({
        service: 'my-service',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Service or project not found');
    });

    it('should handle invalid argument error', async () => {
      const error: any = new Error('Invalid argument');
      error.code = 3;
      mockGetEntries.mockRejectedValue(error);

      const result = await readLogs({
        service: 'my-service',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid filter or arguments');
    });

    it('should handle generic API errors', async () => {
      const error = new Error('Some other error');
      mockGetEntries.mockRejectedValue(error);

      const result = await readLogs({
        service: 'my-service',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to read logs');
    });

    it('should handle unexpected errors', async () => {
      const error = new Error('Unexpected error');
      mockGetEntries.mockRejectedValue(error);

      const result = await readLogs({
        service: 'my-service',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('log entry parsing', () => {
    it('should handle logs with receiveTimestamp when timestamp is missing', async () => {
      const mockLogs = [
        {
          metadata: {
            receiveTimestamp: '2024-01-01T10:00:00.000Z',
            severity: 'INFO',
          },
          data: {
            textPayload: 'Test message',
          },
        },
      ];

      mockGetEntries.mockResolvedValue([mockLogs]);

      const result = await readLogs({
        service: 'my-service',
      });

      expect(result.success).toBe(true);
      expect(result.data?.entries[0].timestamp).toBe('2024-01-01T10:00:00.000Z');
    });

    it('should use DEFAULT severity when not specified', async () => {
      const mockLogs = [
        {
          metadata: {
            timestamp: '2024-01-01T10:00:00.000Z',
          },
          data: {
            textPayload: 'Test message',
          },
        },
      ];

      mockGetEntries.mockResolvedValue([mockLogs]);

      const result = await readLogs({
        service: 'my-service',
      });

      expect(result.success).toBe(true);
      expect(result.data?.entries[0].severity).toBe('DEFAULT');
    });

    it('should stringify jsonPayload as message when message field is missing', async () => {
      const mockLogs = [
        {
          metadata: {
            timestamp: '2024-01-01T10:00:00.000Z',
            severity: 'INFO',
          },
          data: {
            jsonPayload: {
              userId: '123',
              action: 'login',
            },
          },
        },
      ];

      mockGetEntries.mockResolvedValue([mockLogs]);

      const result = await readLogs({
        service: 'my-service',
      });

      expect(result.success).toBe(true);
      expect(result.data?.entries[0].message).toContain('userId');
      expect(result.data?.entries[0].message).toContain('123');
    });

    it('should preserve resource and labels in log entries', async () => {
      const mockLogs = [
        {
          metadata: {
            timestamp: '2024-01-01T10:00:00.000Z',
            severity: 'INFO',
            resource: {
              type: 'cloud_run_revision',
              labels: {
                service_name: 'my-service',
                revision_name: 'my-service-abc123',
              },
            },
            labels: {
              instanceId: 'instance-1',
            },
          },
          data: {
            textPayload: 'Test',
          },
        },
      ];

      mockGetEntries.mockResolvedValue([mockLogs]);

      const result = await readLogs({
        service: 'my-service',
      });

      expect(result.success).toBe(true);
      expect(result.data?.entries[0].resource).toBeDefined();
      expect(result.data?.entries[0].resource?.labels?.service_name).toBe('my-service');
      expect(result.data?.entries[0].labels).toBeDefined();
      expect(result.data?.entries[0].labels?.instanceId).toBe('instance-1');
    });

    it('should extract message from data.message field', async () => {
      const mockLogs = [
        {
          metadata: {
            timestamp: '2024-01-01T10:00:00.000Z',
            severity: 'INFO',
          },
          data: {
            message: 'Direct message field',
            otherField: 'other value',
          },
        },
      ];

      mockGetEntries.mockResolvedValue([mockLogs]);

      const result = await readLogs({
        service: 'my-service',
      });

      expect(result.success).toBe(true);
      expect(result.data?.entries[0].message).toBe('Direct message field');
    });

    it('should prioritize textPayload over jsonPayload', async () => {
      const mockLogs = [
        {
          metadata: {
            timestamp: '2024-01-01T10:00:00.000Z',
            severity: 'INFO',
          },
          data: {
            textPayload: 'Text message',
            jsonPayload: {
              message: 'JSON message',
            },
          },
        },
      ];

      mockGetEntries.mockResolvedValue([mockLogs]);

      const result = await readLogs({
        service: 'my-service',
      });

      expect(result.success).toBe(true);
      expect(result.data?.entries[0].message).toBe('Text message');
    });
  });
});

describe('createReadLogs (curried pattern)', () => {
  let mockGetEntries: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEntries = (Logging as any).mock.results[0]?.value?.getEntries || vi.fn();
    (Logging as any).mockImplementation(() => ({
      getEntries: mockGetEntries,
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a curried function with service config', async () => {
    const mockLogs = [
      {
        metadata: {
          timestamp: '2024-01-01T10:00:00.000Z',
          severity: 'INFO',
        },
        data: {
          textPayload: 'Test message',
        },
      },
    ];

    mockGetEntries.mockResolvedValue([mockLogs]);

    const readMyServiceLogs = createReadLogs({
      service: 'my-service',
      project: 'my-project',
      region: 'us-central1',
    });

    const result = await readMyServiceLogs({ severity: 'ERROR', limit: 50 });

    expect(result.success).toBe(true);
    expect(result.data?.service).toBe('my-service');
    expect(result.data?.project).toBe('my-project');
    expect(Logging).toHaveBeenCalledWith({ projectId: 'my-project' });
    expect(mockGetEntries).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.stringContaining('resource.labels.location="us-central1"'),
        pageSize: 50,
      })
    );
  });

  it('should work with minimal config', async () => {
    mockGetEntries.mockResolvedValue([[]]);

    const readServiceLogs = createReadLogs({
      service: 'test-service',
    });

    const result = await readServiceLogs();

    expect(result.success).toBe(true);
    expect(result.data?.service).toBe('test-service');
  });

  it('should allow multiple calls with different filters', async () => {
    const mockLogs = [
      {
        metadata: {
          timestamp: '2024-01-01T10:00:00.000Z',
          severity: 'ERROR',
        },
        data: {
          textPayload: 'Error message',
        },
      },
    ];

    mockGetEntries.mockResolvedValue([mockLogs]);

    const readServiceLogs = createReadLogs({
      service: 'test-service',
    });

    // First call with ERROR severity
    const result1 = await readServiceLogs({ severity: 'ERROR' });
    expect(result1.success).toBe(true);

    // Second call with different filters
    const result2 = await readServiceLogs({
      severity: 'WARNING',
      limit: 10,
      order: 'asc'
    });
    expect(result2.success).toBe(true);

    // Check that second call used correct options
    expect(mockGetEntries).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filter: expect.stringContaining('severity>=WARNING'),
        pageSize: 10,
        orderBy: 'timestamp asc',
      })
    );
  });

  it('should handle errors properly in curried function', async () => {
    const error: any = new Error('UNAUTHENTICATED');
    error.code = 16;
    mockGetEntries.mockRejectedValue(error);

    const readServiceLogs = createReadLogs({
      service: 'test-service',
    });

    const result = await readServiceLogs();

    expect(result.success).toBe(false);
    expect(result.error).toContain('Not authenticated with Google Cloud');
  });

  it('should merge filter options with config', async () => {
    mockGetEntries.mockResolvedValue([[]]);

    const readServiceLogs = createReadLogs({
      service: 'my-service',
      project: 'my-project',
    });

    await readServiceLogs({
      severity: 'ERROR',
      startTime: '2024-01-01T00:00:00Z',
      limit: 25,
    });

    expect(mockGetEntries).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.stringMatching(/service_name="my-service".*severity>=ERROR.*timestamp>="2024-01-01T00:00:00Z"/),
        pageSize: 25,
      })
    );
  });
});
