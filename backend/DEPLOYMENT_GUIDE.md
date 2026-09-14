# GadgetHub Backend Deployment Guide

This comprehensive guide covers deploying the GadgetHub backend to production.

## 📋 Prerequisites

### System Requirements
- **Node.js**: v18+ (LTS recommended)
- **PostgreSQL**: v15+
- **Redis**: v7+
- **Nginx**: v1.20+ (for reverse proxy)
- **PM2**: For process management
- **Git**: For version control

### Operating System
- **Linux**: Ubuntu 20.04+, Debian 11+, CentOS 8+
- **Windows**: Windows Server 2019+ (with appropriate adjustments)
- **macOS**: For development only

## 🔧 Environment Setup

### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

### 2. Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE gadgethub;
CREATE USER gadgethub_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE gadgethub TO gadgethub_user;
\q

# Enable necessary extensions
sudo -u postgres psql -d gadgethub -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
```

### 3. Redis Configuration

```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf

# Set password (uncomment and change)
requirepass your_redis_password

# Enable persistence
appendonly yes
save 900 1
save 300 10
save 60 10000

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

## 🚀 Application Deployment

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/gadgethub.git /var/www/gadgethub-api
cd /var/www/gadgethub-api

# Or use deployment script
chmod +x deploy.sh
./deploy.sh
```

### 2. Environment Configuration

```bash
# Copy production environment template
cp .env.production.example .env

# Edit with production values
nano .env
```

**Critical values to configure:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string  
- `JWT_SECRET` - Strong random string (min 32 chars)
- `CORS_ORIGIN` - Your production domain
- `S3_*` - File storage credentials
- `SMTP_*` - Email service credentials
- `TWILIO_*` - SMS service credentials

### 3. Install Dependencies

```bash
# Install dependencies
npm ci --production

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:deploy
```

### 4. Build Application

```bash
# Build TypeScript
npm run build

# Verify build output
ls -la dist/
```

### 5. Start Application

```bash
# Using PM2 (recommended)
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Or directly
node dist/src/server.js
```

## 🔒 Security Configuration

### 1. SSL/TLS Setup

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d api.yourdomain.com -d www.api.yourdomain.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

### 2. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 3. Application Security

```bash
# Set proper file permissions
sudo chown -R www-data:www-data /var/www/gadgethub-api
sudo chmod -R 755 /var/www/gadgethub-api

# Secure uploads directory
sudo chmod -R 755 /var/www/gadgethub-uploads
```

## 📊 Monitoring Setup

### 1. Application Monitoring

```bash
# Create log directories
sudo mkdir -p /var/log/gadgethub
sudo chown -R www-data:www-data /var/log/gadgethub

# Set up log rotation
sudo nano /etc/logrotate.d/gadgethub
```

**Add to logrotate config:**
```
/var/log/gadgethub/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reload gadgethub-api
    endscript
}
```

### 2. Database Monitoring

```bash
# Add to crontab for automated backups
crontab -e

# Add this line for daily backups at 2 AM
0 2 * * * /var/www/gadgethub-api/scripts/backup.sh
```

### 3. Health Checks

```bash
# Set up monitoring script
chmod +x scripts/monitor.sh

# Add to crontab for every 5 minutes
*/5 * * * * /var/www/gadgethub-api/scripts/monitor.sh
```

## 🐳 Docker Deployment (Alternative)

### 1. Build Docker Image

```bash
# Build image
docker build -t gadgethub-api:latest .

# Tag for registry
docker tag gadgethub-api:latest your-registry/gadgethub-api:latest
```

### 2. Deploy with Docker Compose

```bash
# Copy production compose file
cp docker-compose.production.yml docker-compose.yml

# Edit environment variables
nano docker-compose.yml

# Start services
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build
      run: npm run build
    
    - name: Deploy to server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /var/www/gadgethub-api
          git pull origin main
          npm ci --production
          npm run prisma:deploy
          npm run build
          pm2 reload gadgethub-api
```

## 🧪 Pre-Deployment Checklist

- [ ] All tests passing locally
- [ ] Production environment variables configured
- [ ] SSL certificates installed
- [ ] Database migrations tested
- [ ] Redis connection verified
- [ ] File storage credentials tested
- [ ] Email service configured
- [ ] SMS service configured
- [ ] Monitoring scripts set up
- [ ] Backup strategy configured
- [ ] Firewall rules configured
- [ ] Log rotation configured
- [ ] Health check endpoint verified
- [ ] Load testing completed
- [ ] Security audit completed

## 🚨 Troubleshooting

### Common Issues

**Application won't start:**
```bash
# Check logs
pm2 logs gadgethub-api

# Check port usage
sudo netstat -tlnp | grep :4000

# Check file permissions
ls -la /var/www/gadgethub-api
```

**Database connection issues:**
```bash
# Test PostgreSQL connection
psql -h localhost -U gadgethub_user -d gadgethub

# Check PostgreSQL status
sudo systemctl status postgresql
```

**Redis connection issues:**
```bash
# Test Redis connection
redis-cli -a your_password ping

# Check Redis status
sudo systemctl status redis-server
```

**Nginx issues:**
```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
```

## 📈 Performance Optimization

### 1. Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_products_active_category ON "Product"(isActive, categoryId);
CREATE INDEX idx_orders_user_status ON "Order"(userId, status);
CREATE INDEX idx_orders_created_at ON "Order"(createdAt DESC);
```

### 2. Redis Optimization

```bash
# Set max memory in redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

### 3. Application Optimization

```bash
# Enable Node.js cluster mode in ecosystem.config.js
instances: 'max'
exec_mode: 'cluster'
```

## 🔄 Scaling Strategies

### Horizontal Scaling

1. **Load Balancer Setup**
   - Use Nginx load balancing
   - Add multiple API instances
   - Configure health checks

2. **Database Scaling**
   - Set up read replicas
   - Implement connection pooling
   - Consider database sharding for large scale

3. **Redis Scaling**
   - Use Redis Cluster
   - Implement cache partitioning
   - Consider Redis Sentinel for high availability

## 📝 Maintenance Tasks

### Daily
- Monitor application logs
- Check error rates
- Verify backup completion
- Review system resources

### Weekly
- Review performance metrics
- Check security updates
- Analyze traffic patterns
- Review and optimize slow queries

### Monthly
- Security audit
- Performance review
- Capacity planning
- Dependency updates
- Backup restoration testing

## 🆘 Support and Documentation

- **Application Logs**: `/var/log/gadgethub/`
- **Nginx Logs**: `/var/log/nginx/`
- **System Logs**: `/var/log/syslog`
- **Database Logs**: PostgreSQL log directory
- **Backup Location**: `/var/backups/gadgethub/`

## 🎯 Success Metrics

Your deployment is successful when:
- ✅ All health checks pass
- ✅ API responds within 200ms for most requests
- ✅ Error rate is below 1%
- ✅ Database connections are stable
- ✅ Redis cache hit rate > 80%
- ✅ Automated backups complete successfully
- ✅ Monitoring alerts are configured
- ✅ SSL certificate is valid
- ✅ Load tests meet performance targets

## 📞 Emergency Procedures

### Application Down
```bash
# Restart application
pm2 restart gadgethub-api

# If that fails, restart system
sudo systemctl restart nginx
sudo systemctl restart postgresql
sudo systemctl restart redis-server
```

### Database Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Restore from backup if needed
gunzip < /var/backups/gadgethub/latest_backup.sql.gz | psql -U gadgethub_user -d gadgethub
```

### Rollback Deployment
```bash
# Stop current deployment
pm2 stop gadgethub-api

# Restore from backup
cd /var/backups/gadgethub
tar -xzf gadgethub_latest_backup.tar.gz -C /var/www/gadgethub-api

# Restart
pm2 start gadgethub-api
```

---

Your GadgetHub backend is now ready for production deployment! 🚀