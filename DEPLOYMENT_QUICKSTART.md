# Quick Start: Deploying Your Modified Jitsi Meet

## Prerequisites

1. **Local Machine:**
   - Node.js >= 22.0.0
   - npm >= 10.0.0
   - Ansible installed (`pip install ansible` or `brew install ansible`)

2. **Server:**
   - Ubuntu/Debian with Jitsi Meet already installed
   - SSH access with sudo privileges
   - Nginx running

## Step-by-Step Deployment

### 1. Build Your Modified Jitsi Meet

```bash
# In your jitsi-meet directory
cd /Users/nikita/code/jitsi-meet

# Install dependencies (if not already done)
npm install

# Build the project
make
```

This will:
- Compile all JavaScript bundles
- Generate CSS
- Create the `libs/` directory with all required files

### 2. Set Up Ansible Inventory

```bash
# Copy the example inventory
cp ansible-inventory.example ansible-inventory

# Edit with your server details
nano ansible-inventory
```

Update with your server IP/hostname and SSH user.

### 3. Test Ansible Connection

```bash
ansible -i ansible-inventory jitsi_servers -m ping
```

### 4. Deploy

```bash
# Deploy to your server
ansible-playbook -i ansible-inventory ansible-deploy.yml
```

### 5. Verify Deployment

1. Clear browser cache or use incognito mode
2. Visit your Jitsi Meet instance
3. Check browser console for errors
4. Test your modifications

## Customization

### Deploy from Different Directory

```bash
ansible-playbook -i ansible-inventory ansible-deploy.yml \
  -e "jitsi_source_dir=/path/to/your/jitsi-meet"
```

### Skip Backup

```bash
ansible-playbook -i ansible-inventory ansible-deploy.yml \
  -e "backup_enabled=false"
```

### Skip Nginx Reload

```bash
ansible-playbook -i ansible-inventory ansible-deploy.yml \
  -e "nginx_reload=false"
```

## Rollback

If something goes wrong, restore from backup:

```bash
# SSH into your server
ssh your-server

# List backups
ls -lh /tmp/jitsi-meet-backup-*.tar.gz

# Restore (replace timestamp with actual backup)
sudo tar -xzf /tmp/jitsi-meet-backup-1234567890.tar.gz -C /

# Reload nginx
sudo systemctl reload nginx
```

## Troubleshooting

### Build Fails

- Check Node.js version: `node --version` (must be >= 22.0.0)
- Check npm version: `npm --version` (must be >= 10.0.0)
- Try cleaning: `make clean && make`

### Deployment Fails

- Verify SSH access: `ansible -i ansible-inventory jitsi_servers -m ping`
- Check sudo access: `ansible -i ansible-inventory jitsi_servers -a "sudo whoami"`
- Verify source directory exists and has been built

### Changes Not Visible

- Clear browser cache completely
- Use incognito/private browsing mode
- Check browser console for JavaScript errors
- Verify files were copied: `ls -la /usr/share/jitsi-meet/libs/`

### Nginx Errors

- Check nginx config: `sudo nginx -t`
- Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Verify file permissions: `ls -la /usr/share/jitsi-meet/`

## Advanced: CI/CD Integration

You can integrate this into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Build Jitsi Meet
  run: |
    npm install
    make
    
- name: Deploy with Ansible
  run: |
    ansible-playbook -i ansible-inventory ansible-deploy.yml
  env:
    ANSIBLE_HOST_KEY_CHECKING: False
```

## Next Steps

- See `DEPLOYMENT.md` for detailed deployment options
- Consider setting up automated backups
- Monitor server logs after deployment
- Test all features after deployment

