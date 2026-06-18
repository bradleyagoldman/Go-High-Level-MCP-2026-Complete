import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import axios from 'axios';
import { SocialMediaTools } from '../../src/tools/social-media-tools.js';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    isAxiosError: jest.fn((error: any) => Boolean(error?.isAxiosError)),
  },
}));

const metricoolEnvKeys = [
  'METRICOOL_USER_TOKEN',
  'METRICOOL_API_TOKEN',
  'METRICOOL_TOKEN',
  'METRICOOL_USER_ID',
  'METRICOOL_BLOG_ID',
  'METRICOOL_BASE_URL',
];

describe('SocialMediaTools Metricool integration', () => {
  let tools: SocialMediaTools;
  let previousEnv: Record<string, string | undefined>;

  beforeEach(() => {
    tools = new SocialMediaTools({} as any);
    previousEnv = Object.fromEntries(metricoolEnvKeys.map((key) => [key, process.env[key]]));
    for (const key of metricoolEnvKeys) delete process.env[key];
    jest.clearAllMocks();
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('registers Metricool read tools with read metadata', () => {
    const metricoolTools = tools.getTools().filter((tool) => tool.name.startsWith('get_metricool_'));
    const names = metricoolTools.map((tool) => tool.name);

    expect(names).toEqual(expect.arrayContaining([
      'get_metricool_config_status',
      'get_metricool_brands',
      'get_metricool_scheduled_posts',
      'get_metricool_timeline_analytics',
      'get_metricool_read_endpoint',
    ]));
    expect(metricoolTools).toHaveLength(5);
    expect(metricoolTools.every((tool) => (tool as any)._meta.labels.access === 'read')).toBe(true);
    expect(metricoolTools.every((tool) => (tool as any)._meta.labels.category === 'metricool')).toBe(true);
  });

  it('reports Metricool config readiness without leaking tokens', async () => {
    process.env.METRICOOL_USER_TOKEN = 'secret-token';
    process.env.METRICOOL_USER_ID = 'user-123';

    const status = await tools.executeTool('get_metricool_config_status', {});

    expect(status).toMatchObject({
      success: true,
      configured: true,
      configuredForBrandReads: false,
      hasUserToken: true,
      hasUserId: true,
      hasDefaultBlogId: false,
      baseUrl: 'https://app.metricool.com/api',
    });
    expect(JSON.stringify(status)).not.toContain('secret-token');
  });

  it('fetches Metricool brands with header auth and user query params', async () => {
    (axios.get as jest.Mock).mockResolvedValue({ data: [{ blogId: 123, label: 'Main Brand' }] } as never);

    const result = await tools.executeTool('get_metricool_brands', {
      userToken: 'token-123',
      userId: 'user-123',
    });

    expect(axios.get).toHaveBeenCalledWith(
      'https://app.metricool.com/api/admin/simpleProfiles',
      {
        params: { userId: 'user-123' },
        headers: {
          'X-Mc-Auth': 'token-123',
          'Accept': 'application/json',
        },
        timeout: 30000,
      }
    );
    expect(result).toMatchObject({
      success: true,
      brands: [{ blogId: 123, label: 'Main Brand' }],
      count: 1,
    });
  });

  it('fetches scheduled posts with normalized planner range params', async () => {
    process.env.METRICOOL_USER_TOKEN = 'env-token';
    process.env.METRICOOL_USER_ID = 'user-123';
    process.env.METRICOOL_BLOG_ID = 'blog-456';
    process.env.METRICOOL_BASE_URL = 'https://metricool.test/api/';
    (axios.get as jest.Mock).mockResolvedValue({ data: [{ id: 'post-1' }] } as never);

    const result = await tools.executeTool('get_metricool_scheduled_posts', {
      start: '2026-06-01',
      end: '2026-06-30',
      timezone: 'America/Los_Angeles',
    });

    expect(axios.get).toHaveBeenCalledWith(
      'https://metricool.test/api/v2/scheduler/posts',
      expect.objectContaining({
        params: {
          integrationSource: 'MCP',
          start: '2026-06-01T00:00:00',
          end: '2026-06-30T23:59:59',
          timezone: 'America/Los_Angeles',
          extendedRange: false,
          userId: 'user-123',
          blogId: 'blog-456',
        },
      })
    );
    expect(result).toMatchObject({
      success: true,
      scheduledPosts: [{ id: 'post-1' }],
      count: 1,
    });
  });

  it('fetches timeline analytics from the documented timeling endpoint', async () => {
    (axios.get as jest.Mock).mockResolvedValue({ data: { values: [1, 2, 3] } } as never);

    const result = await tools.executeTool('get_metricool_timeline_analytics', {
      userToken: 'token-123',
      userId: 'user-123',
      blogId: 'blog-456',
      metric: 'igFollowers',
      start: '2026-06-01',
      end: '2026-06-30',
    });

    expect(axios.get).toHaveBeenCalledWith(
      'https://app.metricool.com/api/stats/timeling/igFollowers',
      expect.objectContaining({
        params: {
          start: '2026-06-01',
          end: '2026-06-30',
          userId: 'user-123',
          blogId: 'blog-456',
        },
      })
    );
    expect(result).toMatchObject({
      success: true,
      metric: 'igFollowers',
      analytics: { values: [1, 2, 3] },
    });
  });

  it('blocks generic Metricool reads outside the allowed read prefixes', async () => {
    await expect(tools.executeTool('get_metricool_read_endpoint', {
      endpoint: 'https://example.com/stats/timeling/igFollowers',
      userToken: 'token-123',
      userId: 'user-123',
      blogId: 'blog-456',
    })).rejects.toThrow('Metricool endpoint must be a path without protocol or query string');

    await expect(tools.executeTool('get_metricool_read_endpoint', {
      endpoint: '/users',
      userToken: 'token-123',
      userId: 'user-123',
      blogId: 'blog-456',
    })).rejects.toThrow('Metricool endpoint is not allowed: /users');
  });
});
