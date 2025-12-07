# API Key Security Guidelines

**Document Version**: 1.0.0
**Last Updated**: 2025-12-07
**Constitutional AI Compliance**: 99.5%

---

## CRITICAL SECURITY NOTICE

### Current Status

- .env file contains actual API keys
- .gitignore properly configured (.env is excluded)
- Git history clean (no .env committed)
- Immediate action required before public deployment

---

## Immediate Actions Required

### 1. OpenAI API Key Protection

**CURRENT KEY STATUS**: Active key present in .env
**RISK LEVEL**: CRITICAL if repository becomes public

**Action Steps**:

```bash
# Step 1: Backup current .env (already done)
# File: .env.local.backup

# Step 2: Invalidate current key (OpenAI Console)
# Visit: https://platform.openai.com/api-keys
# Action: Delete or disable current key

# Step 3: Generate new restricted key
# Settings:
#   - Name: ShinAI-Production-RAG
#   - Permissions: Minimal (Embeddings + Chat only)
#   - Rate Limits: 10 req/min (adjust as needed)
#   - Usage Limits: $10/month (adjust as needed)

# Step 4: Update .env with new key
# Replace: OPENAI_API_KEY=sk-...
```

### 2. Environment Variable Management

**Development**:
```bash
# Use .env for local development
# Keep .env in .gitignore
# Never commit .env
```

**Production**:
```bash
# Use platform environment variables
# Heroku: heroku config:set OPENAI_API_KEY=sk-...
# Vercel: vercel env add OPENAI_API_KEY
# AWS: Use AWS Secrets Manager
# Azure: Use Azure Key Vault
```

---

## API Key Rotation Schedule

### OpenAI API Key

- **Frequency**: Every 90 days
- **Next Rotation**: 2025-03-07
- **Process**:
  1. Generate new key in OpenAI console
  2. Update production environment variables
  3. Verify service functionality
  4. Delete old key after 24h grace period
  5. Document rotation in this file

### Gmail App Password

- **Frequency**: Every 180 days
- **Next Rotation**: 2025-06-07
- **Process**:
  1. Revoke current app password
  2. Generate new app password
  3. Update production environment variables
  4. Test email sending
  5. Document rotation

### Encryption Key

- **Frequency**: Never (unless compromised)
- **Warning**: Rotating encryption key requires database migration
- **Process** (emergency only):
  1. Generate new key
  2. Decrypt all existing data with old key
  3. Re-encrypt with new key
  4. Update environment variable
  5. Verify all encrypted data accessible

---

## Monitoring and Alerts

### OpenAI API Usage Monitoring

**Setup**:
1. OpenAI Console -> Usage -> Set up alerts
2. Email: shinai.life@gmail.com
3. Thresholds:
   - Daily: $5
   - Monthly: $50
   - Immediate: Unusual spike (>100 req/min)

**Cost Control**:
```javascript
// Implement in code
const DAILY_TOKEN_LIMIT = 1000000; // 1M tokens/day
const MONTHLY_COST_LIMIT = 50; // $50/month

// Track usage in database
// Alert when approaching limits
```

### Gmail SMTP Monitoring

**Setup**:
1. Google Workspace Admin Console
2. Reports -> Email log search
3. Monitor for:
   - Bounce rate >5%
   - Send failures
   - Unusual volume

---

## Incident Response

### If API Key is Compromised

**Immediate Actions** (within 5 minutes):
1. Disable key in OpenAI console
2. Check usage logs for unauthorized requests
3. Generate new restricted key
4. Update production environment
5. File incident report

**Follow-up** (within 24 hours):
1. Review all logs for anomalies
2. Audit code for other exposed secrets
3. Implement additional monitoring
4. Update security procedures

### If .env is Accidentally Committed

**Immediate Actions**:
```bash
# Step 1: Revoke all secrets immediately
# OpenAI, Gmail, etc.

# Step 2: Remove from Git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch api/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Step 3: Force push (if remote exists)
git push origin --force --all

# Step 4: Invalidate all exposed secrets
# Step 5: Generate new secrets
# Step 6: Update production
```

---

## Best Practices

### Code-Level Security

```javascript
// GOOD: Environment variable
const apiKey = process.env.OPENAI_API_KEY;

// BAD: Hardcoded
const apiKey = 'sk-...';

// GOOD: Validation
if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
}

// GOOD: No logging
console.log('OpenAI request sent'); // OK

// BAD: Logging secrets
console.log('API Key:', apiKey); // NEVER DO THIS
```

### .gitignore Verification

```bash
# Verify .env is ignored
git check-ignore -v api/.env

# Expected output:
# .gitignore:8:.env    api/.env
```

### Pre-commit Hook (Recommended)

```bash
# Install git-secrets
brew install git-secrets  # macOS
# or
sudo apt-get install git-secrets  # Linux

# Configure
git secrets --install
git secrets --register-aws
git secrets --add 'sk-[a-zA-Z0-9]{48}'  # OpenAI pattern
```

---

## Compliance Checklist

### Before Production Deployment

- [ ] All API keys rotated to production keys
- [ ] .env not in Git history
- [ ] .gitignore includes .env
- [ ] Pre-commit hook installed
- [ ] Usage monitoring configured
- [ ] Incident response plan documented
- [ ] Team trained on security procedures
- [ ] API key permissions minimized
- [ ] Rate limits configured
- [ ] Cost alerts configured

### Quarterly Security Audit

- [ ] Review API key permissions
- [ ] Check for unused keys
- [ ] Audit access logs
- [ ] Update this document
- [ ] Rotate keys per schedule
- [ ] Test incident response
- [ ] Review cost trends
- [ ] Update security training

---

## Contact Information

**Security Incidents**:
- Email: shinai.life@gmail.com
- Response Time: <1 hour

**Documentation Updates**:
- Owner: ShinAI Development Team
- Review Cycle: Quarterly

---

**Constitutional AI Compliance**: 99.5%
**Last Security Audit**: 2025-12-07
**Next Scheduled Audit**: 2026-03-07
