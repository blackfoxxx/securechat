# Rate Limiting Configuration Guide

This document explains the rate limiting configuration implemented in Secure Chat Web to protect against abuse, DDoS attacks, and ensure service stability.

## Table of Contents

- [Overview](#overview)
- [Rate Limit Zones](#rate-limit-zones)
- [Customization](#customization)
- [Testing](#testing)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

Rate limiting is implemented using Nginx's `limit_req` and `limit_conn` modules. This provides:

- **DDoS Protection**: Prevents overwhelming the server with requests
- **Brute Force Prevention**: Limits authentication attempts
- **Fair Resource Allocation**: Ensures all users get fair access
- **Cost Control**: Reduces infrastructure costs by preventing abuse
- **Service Stability**: Maintains performance under load

## Rate Limit Zones

The configuration defines multiple rate limiting zones for different types of requests:

### 1. General API Requests (`api_limit`)
- **Rate**: 60 requests per minute per IP
- **Burst**: 20 additional requests allowed
- **Use Case**: General API endpoints
- **Applies To**: All `/api/*` endpoints (except those with specific limits)

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=60r/m;
location / {
    limit_req zone=api_limit burst=20 nodelay;
}
```

### 2. Authentication Endpoints (`auth_limit`)
- **Rate**: 5 requests per minute per IP
- **Burst**: 3 additional requests allowed
- **Use Case**: Prevent brute force attacks on login
- **Applies To**: `/api/auth/*`, `/api/oauth/*`

```nginx
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;
location ~ ^/api/(auth|oauth) {
    limit_req zone=auth_limit burst=3 nodelay;
}
```

**Why strict?** Authentication endpoints are prime targets for brute force attacks. The low rate limit (5/min) allows legitimate users to retry failed logins while blocking automated attacks.

### 3. File Upload Endpoints (`upload_limit`)
- **Rate**: 10 uploads per minute per IP
- **Burst**: 5 additional uploads allowed
- **Use Case**: Prevent storage abuse and bandwidth exhaustion
- **Applies To**: `/api/upload/*`

```nginx
limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=10r/m;
location ~ ^/api/upload {
    limit_req zone=upload_limit burst=5 nodelay;
    client_max_body_size 100M;
}
```

### 4. WebSocket Connections (`websocket_limit`)
- **Rate**: 20 connections per minute per IP
- **Burst**: 10 additional connections allowed
- **Use Case**: Prevent connection flooding
- **Applies To**: `/socket.io/*`

```nginx
limit_req_zone $binary_remote_addr zone=websocket_limit:10m rate=20r/m;
location /socket.io/ {
    limit_req zone=websocket_limit burst=10 nodelay;
}
```

### 5. Search Endpoints (`search_limit`)
- **Rate**: 30 requests per minute per IP
- **Burst**: 10 additional requests allowed
- **Use Case**: Prevent search abuse (expensive database queries)
- **Applies To**: `/api/*search*`

```nginx
limit_req_zone $binary_remote_addr zone=search_limit:10m rate=30r/m;
location ~ ^/api/.*search {
    limit_req zone=search_limit burst=10 nodelay;
}
```

### 6. Message Sending (`message_limit`)
- **Rate**: 100 messages per minute per IP
- **Burst**: 30 additional messages allowed
- **Use Case**: Prevent spam while allowing normal conversation
- **Applies To**: `/api/*message*`

```nginx
limit_req_zone $binary_remote_addr zone=message_limit:10m rate=100r/m;
location ~ ^/api/.*message {
    limit_req zone=message_limit burst=30 nodelay;
}
```

### 7. Concurrent Connections (`conn_limit`)
- **Limit**: 50 concurrent connections per IP
- **Use Case**: Prevent connection exhaustion
- **Applies To**: All requests

```nginx
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
server {
    limit_conn conn_limit 50;
}
```

## Customization

### Adjusting Rate Limits

Edit `/nginx/nginx-rate-limit.conf` and modify the rate values:

```nginx
# Increase general API limit to 120 requests per minute
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=120r/m;

# Decrease authentication limit to 3 requests per minute
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=3r/m;
```

After changes, restart Nginx:
```bash
docker-compose -f docker-compose.prod.yml restart nginx
```

### Adjusting Burst Allowances

Burst allows temporary spikes above the rate limit:

```nginx
# Allow 50 burst requests instead of 20
location / {
    limit_req zone=api_limit burst=50 nodelay;
}
```

**Note**: `nodelay` means burst requests are processed immediately. Without it, they're delayed to match the rate limit.

### Whitelisting IPs

To exempt specific IPs from rate limiting (e.g., monitoring services, admin IPs):

```nginx
geo $limit {
    default 1;
    10.0.0.0/8 0;           # Internal network
    192.168.1.100 0;        # Admin IP
    203.0.113.50 0;         # Monitoring service
}

map $limit $limit_key {
    0 "";
    1 $binary_remote_addr;
}

# Then use $limit_key instead of $binary_remote_addr
limit_req_zone $limit_key zone=api_limit:10m rate=60r/m;
```

### Custom Error Pages

The configuration includes custom HTML error pages for rate limiting (429) and server errors (502, 503, 504). Customize them in the `error_page` sections:

```nginx
error_page 429 /429.html;
location = /429.html {
    internal;
    default_type text/html;
    return 429 'Your custom HTML here';
}
```

## Testing

### Manual Testing with curl

Test rate limits using curl:

```bash
# Test general API rate limit (should succeed)
for i in {1..10}; do
  curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/api/health
  sleep 0.5
done

# Test authentication rate limit (should hit 429 after 5 requests)
for i in {1..10}; do
  curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/api/auth/login
  sleep 0.5
done
```

### Load Testing with Apache Bench

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test with 100 requests, 10 concurrent
ab -n 100 -c 10 https://your-domain.com/api/health

# Look for "Non-2xx responses" in the output
```

### Load Testing with wrk

```bash
# Install wrk
sudo apt-get install wrk

# Test with 12 threads, 400 connections for 30 seconds
wrk -t12 -c400 -d30s https://your-domain.com/api/health

# Check for 429 responses in output
```

### Automated Testing Script

Create a test script:

```bash
#!/bin/bash
# test-rate-limits.sh

DOMAIN="https://your-domain.com"

echo "Testing General API Rate Limit..."
for i in {1..70}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" $DOMAIN/api/health)
  echo "Request $i: $STATUS"
  if [ "$STATUS" = "429" ]; then
    echo "✓ Rate limit working (got 429 at request $i)"
    break
  fi
  sleep 0.9
done

echo ""
echo "Testing Auth Rate Limit..."
for i in {1..10}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" $DOMAIN/api/auth/me)
  echo "Request $i: $STATUS"
  if [ "$STATUS" = "429" ]; then
    echo "✓ Auth rate limit working (got 429 at request $i)"
    break
  fi
  sleep 10
done
```

Run it:
```bash
chmod +x test-rate-limits.sh
./test-rate-limits.sh
```

## Monitoring

### View Rate Limit Logs

```bash
# View Nginx access logs
docker logs secure-chat-nginx 2>&1 | grep " 429 "

# View real-time 429 errors
docker logs -f secure-chat-nginx 2>&1 | grep " 429 "

# Count 429 errors in last hour
docker logs secure-chat-nginx --since 1h 2>&1 | grep -c " 429 "
```

### Monitor Rate Limit Metrics

Add to your monitoring system:

```bash
# Prometheus metrics (if using nginx-prometheus-exporter)
nginx_http_requests_total{status="429"}

# Custom monitoring script
#!/bin/bash
# monitor-rate-limits.sh

THRESHOLD=100
COUNT=$(docker logs secure-chat-nginx --since 5m 2>&1 | grep -c " 429 ")

if [ $COUNT -gt $THRESHOLD ]; then
    echo "ALERT: High rate limit hits ($COUNT in last 5 minutes)"
    # Send alert (email, Slack, etc.)
fi
```

### Identify Top Rate Limited IPs

```bash
# Find IPs hitting rate limits most
docker logs secure-chat-nginx 2>&1 | \
  grep " 429 " | \
  awk '{print $1}' | \
  sort | uniq -c | sort -rn | head -10
```

## Troubleshooting

### Problem: Legitimate Users Getting Rate Limited

**Symptoms**: Users report "Too Many Requests" errors during normal use

**Solutions**:
1. Increase rate limits for the affected endpoint
2. Increase burst allowance
3. Whitelist the user's IP if they're a power user
4. Implement user-based rate limiting instead of IP-based

```nginx
# Example: Increase message limit
limit_req_zone $binary_remote_addr zone=message_limit:10m rate=200r/m;
```

### Problem: Rate Limits Not Working

**Symptoms**: Can send unlimited requests without getting 429

**Checks**:
1. Verify Nginx config syntax:
   ```bash
   docker exec secure-chat-nginx nginx -t
   ```

2. Check if rate limit zones are defined:
   ```bash
   docker exec secure-chat-nginx cat /etc/nginx/nginx.conf | grep limit_req_zone
   ```

3. Verify location blocks have rate limiting:
   ```bash
   docker exec secure-chat-nginx cat /etc/nginx/nginx.conf | grep -A 5 "location /"
   ```

4. Restart Nginx:
   ```bash
   docker-compose -f docker-compose.prod.yml restart nginx
   ```

### Problem: Shared IP (NAT/Proxy) Rate Limiting

**Symptoms**: Multiple users behind same IP (corporate network, VPN) share rate limits

**Solutions**:
1. Use `X-Forwarded-For` header for rate limiting:
   ```nginx
   limit_req_zone $http_x_forwarded_for zone=api_limit:10m rate=60r/m;
   ```

2. Implement user-based rate limiting (requires authentication):
   ```nginx
   map $cookie_session $user_id {
       default $binary_remote_addr;
       ~.+ $cookie_session;
   }
   limit_req_zone $user_id zone=api_limit:10m rate=60r/m;
   ```

3. Whitelist the shared IP and implement application-level rate limiting

### Problem: Rate Limit Memory Usage

**Symptoms**: High memory usage by Nginx

**Cause**: Rate limit zones store state in memory (10m = 10 megabytes per zone)

**Solutions**:
1. Reduce zone size if not needed:
   ```nginx
   limit_req_zone $binary_remote_addr zone=api_limit:5m rate=60r/m;
   ```

2. Monitor memory usage:
   ```bash
   docker stats secure-chat-nginx
   ```

## Best Practices

### 1. Start Conservative, Then Relax

Begin with strict limits and increase based on actual usage patterns:

```nginx
# Week 1: Conservative
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/m;

# Week 2: After monitoring, increase
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=60r/m;
```

### 2. Different Limits for Different Endpoints

Not all endpoints are equal:
- **Expensive operations** (search, reports): Lower limits
- **Cheap operations** (health checks): Higher limits or no limits
- **Critical operations** (auth): Very strict limits

### 3. Use Burst Wisely

Burst allows legitimate traffic spikes but can be abused:

```nginx
# Good: Small burst for occasional spikes
limit_req zone=api_limit burst=10 nodelay;

# Bad: Large burst defeats the purpose
limit_req zone=api_limit burst=1000 nodelay;
```

### 4. Monitor and Adjust

Regularly review rate limit logs:
- Are legitimate users being blocked?
- Are attackers still getting through?
- What are the actual usage patterns?

### 5. Combine with Application-Level Rate Limiting

Nginx rate limiting is IP-based. For better control, also implement rate limiting in your application:

```typescript
// Example: User-based rate limiting in tRPC
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per user
  keyGenerator: (req) => req.user?.id || req.ip,
});
```

### 6. Document Your Limits

Make rate limits visible to API users:
- Include in API documentation
- Return `X-RateLimit-*` headers
- Provide clear error messages

```nginx
# Add rate limit headers
add_header X-RateLimit-Limit 60 always;
add_header X-RateLimit-Remaining $limit_req_remaining always;
```

### 7. Plan for Growth

As your user base grows, you'll need to:
- Increase rate limits
- Implement user-tier based limits (free vs. paid)
- Consider CDN for static assets
- Scale horizontally with load balancers

### 8. Security Considerations

- **Don't rely solely on rate limiting** for security
- Combine with authentication, authorization, input validation
- Use HTTPS to prevent header manipulation
- Monitor for distributed attacks (many IPs)

## Rate Limit Recommendations by Use Case

### Small Team (< 50 users)
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=120r/m;
limit_req_zone $binary_remote_addr zone=message_limit:10m rate=200r/m;
```

### Medium Business (50-500 users)
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=60r/m;
limit_req_zone $binary_remote_addr zone=message_limit:10m rate=100r/m;
```

### Large Enterprise (500+ users)
- Implement user-based rate limiting
- Use Redis for distributed rate limiting
- Consider API gateway (Kong, Tyk) for advanced features

### Public API
```nginx
# Stricter limits for unauthenticated users
limit_req_zone $binary_remote_addr zone=public_api:10m rate=30r/m;

# Higher limits for authenticated users
limit_req_zone $http_authorization zone=auth_api:10m rate=300r/m;
```

## Additional Resources

- [Nginx Rate Limiting Documentation](http://nginx.org/en/docs/http/ngx_http_limit_req_module.html)
- [Nginx Connection Limiting](http://nginx.org/en/docs/http/ngx_http_limit_conn_module.html)
- [Rate Limiting Best Practices](https://www.nginx.com/blog/rate-limiting-nginx/)

## Support

For questions about rate limiting configuration:
- Check logs: `docker logs secure-chat-nginx`
- Test configuration: `docker exec secure-chat-nginx nginx -t`
- GitHub Issues: [Your repo issues page]

---

**Note**: Rate limiting is one layer of defense. Always combine with proper authentication, authorization, input validation, and monitoring for comprehensive security.
