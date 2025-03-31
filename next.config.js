/** @type {import('next').NextConfig} */
const nextConfig = {
  // Custom rewrites to handle the problematic SSE requests
  async rewrites() {
    return [
      {
        source: '/sse',
        destination: '/api/sse-handler',
        // Only rewrite the specific SSE requests that cause 404 errors
        has: [
          {
            type: 'query',
            key: 'transportType',
            value: 'stdio'
          },
          {
            type: 'query',
            key: 'command',
            value: '(?:.*launch_for_inspector\\.bat.*)'
          }
        ]
      }
    ]
  }
};

module.exports = nextConfig;
