import { sanitizeLogMeta } from './logger';

describe('sanitizeLogMeta', () => {
  it('redacts sensitive keys recursively without mutating the original meta object', () => {
    const meta = {
      accessToken: 'access-token-value',
      nested: {
        refresh_token: 'refresh-token-value',
        headers: {
          Authorization: 'Bearer token-value'
        }
      },
      users: [
        {
          password: 'password-value',
          email: 'user@example.com'
        }
      ]
    };

    expect(sanitizeLogMeta(meta)).toEqual({
      accessToken: '[REDACTED]',
      nested: {
        refresh_token: '[REDACTED]',
        headers: {
          Authorization: '[REDACTED]'
        }
      },
      users: [
        {
          password: '[REDACTED]',
          email: 'user@example.com'
        }
      ]
    });
    expect(meta.nested.headers.Authorization).toBe('Bearer token-value');
  });

  it('sanitizes ApiError-like objects before logging', () => {
    const error = new Error('요청 실패');
    error.status = 401;
    error.errorCode = 'UNAUTHORIZED';
    error.payload = {
      signupToken: 'signup-token-value',
      reason: 'missing profile'
    };

    expect(sanitizeLogMeta(error)).toEqual({
      name: 'Error',
      message: '요청 실패',
      status: 401,
      errorCode: 'UNAUTHORIZED',
      payload: {
        signupToken: '[REDACTED]',
        reason: 'missing profile'
      }
    });
  });

  it('handles circular references safely', () => {
    const meta = { status: 500 };
    meta.self = meta;

    expect(sanitizeLogMeta(meta)).toEqual({
      status: 500,
      self: '[Circular]'
    });
  });

  it('redacts bearer tokens and auth query values embedded in strings', () => {
    expect(
      sanitizeLogMeta('Authorization: Bearer token-value https://user:pass@example.com/callback?code=oauth-code&serviceKey=open-api-key&state=ok')
    ).toBe('Authorization: Bearer [REDACTED] https://user:[REDACTED]@example.com/callback?code=[REDACTED]&serviceKey=[REDACTED]&state=ok');
  });

  it('redacts jwt-looking values embedded in strings', () => {
    expect(
      sanitizeLogMeta('failed token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature')
    ).toBe('failed token [REDACTED]');
  });
});
