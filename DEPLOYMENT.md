# Jitsi Meet Deployment Guide

This guide outlines how to deploy your modified Jitsi Meet to a Ubuntu/Debian server using Ansible.

## Build Process Overview

Jitsi Meet uses a Makefile-based build system:
1. **Dependencies**: `npm install` (requires Node.js >= 22.0.0, npm >= 10.0.0)
2. **Build**: `make` or `make all` - compiles webpack bundles and creates production assets
3. **Output**: Files are generated in:
   - `libs/` - JavaScript bundles and WASM files
   - `css/all.css` - Compiled CSS
   - Other static files (HTML, images, sounds, fonts, lang, etc.)

## Deployment Location

On a standard Debian/Ubuntu installation, Jitsi Meet files are located at:
- **Main directory**: `/usr/share/jitsi-meet/`
- **Configuration**: `/etc/jitsi/meet/` (nginx config, interface_config.js, config.js)

## Deployment Options

### Option 1: Direct File Copy (Recommended for Custom Builds)

**Pros:**
- Simple and fast
- No package management overhead
- Easy to rollback
- Works well with Ansible

**Cons:**
- Manual file management
- No automatic dependency tracking

**Build Steps:**
```bash
# On your local machine or CI/CD
npm install
make
```

**Ansible Playbook Example:**
```yaml
---
- name: Deploy Jitsi Meet
  hosts: jitsi_servers
  become: yes
  vars:
    jitsi_deploy_path: /usr/share/jitsi-meet
    jitsi_source_dir: /path/to/your/jitsi-meet
    
  tasks:
    - name: Ensure deployment directory exists
      file:
        path: "{{ jitsi_deploy_path }}"
        state: directory
        owner: root
        group: root
        mode: '0755'
    
    - name: Backup current installation
      command: >
        tar -czf /tmp/jitsi-meet-backup-{{ ansible_date_time.epoch }}.tar.gz
        {{ jitsi_deploy_path }}
      when: backup_enabled | default(true)
      changed_when: false
    
    - name: Copy HTML files
      copy:
        src: "{{ jitsi_source_dir }}/{{ item }}"
        dest: "{{ jitsi_deploy_path }}/{{ item }}"
        owner: root
        group: root
        mode: '0644'
      loop:
        - "*.html"
        - "*.js"
        - "pwa-worker.js"
        - "manifest.json"
      loop_control:
        label: "{{ item }}"
    
    - name: Copy built libs directory
      synchronize:
        src: "{{ jitsi_source_dir }}/libs/"
        dest: "{{ jitsi_deploy_path }}/libs/"
        delete: yes
        owner: yes
        group: yes
        perms: yes
    
    - name: Copy CSS
      copy:
        src: "{{ jitsi_source_dir }}/css/all.css"
        dest: "{{ jitsi_deploy_path }}/css/all.css"
        owner: root
        group: root
        mode: '0644'
    
    - name: Copy static directories
      synchronize:
        src: "{{ jitsi_source_dir }}/{{ item }}/"
        dest: "{{ jitsi_deploy_path }}/{{ item }}/"
        delete: yes
        owner: yes
        group: yes
        perms: yes
      loop:
        - static
        - sounds
        - fonts
        - images
        - lang
    
    - name: Copy resources
      copy:
        src: "{{ jitsi_source_dir }}/resources/robots.txt"
        dest: "{{ jitsi_deploy_path }}/robots.txt"
        owner: root
        group: root
        mode: '0644'
    
    - name: Reload nginx
      systemd:
        name: nginx
        state: reloaded
      when: nginx_reload | default(true)
```

### Option 2: Tarball Deployment

**Pros:**
- Single file transfer
- Versioned deployments
- Easy rollback

**Build Steps:**
```bash
npm install
make source-package
# Creates: jitsi-meet.tar.bz2
```

**Ansible Playbook Example:**
```yaml
---
- name: Deploy Jitsi Meet from Tarball
  hosts: jitsi_servers
  become: yes
  vars:
    jitsi_deploy_path: /usr/share/jitsi-meet
    jitsi_tarball: jitsi-meet.tar.bz2
    jitsi_version: "{{ ansible_date_time.epoch }}"
    
  tasks:
    - name: Upload tarball
      copy:
        src: "{{ jitsi_tarball }}"
        dest: /tmp/{{ jitsi_tarball }}
        mode: '0644'
    
    - name: Backup current installation
      archive:
        path: "{{ jitsi_deploy_path }}"
        dest: "/tmp/jitsi-meet-backup-{{ jitsi_version }}.tar.gz"
        format: gz
      when: backup_enabled | default(true)
    
    - name: Extract tarball to temporary location
      unarchive:
        src: /tmp/{{ jitsi_tarball }}
        dest: /tmp/
        remote_src: yes
    
    - name: Remove old files (preserve config)
      file:
        path: "{{ jitsi_deploy_path }}/{{ item }}"
        state: absent
      loop:
        - libs
        - css
        - static
        - sounds
        - fonts
        - images
        - lang
        - "*.html"
        - "*.js"
        - pwa-worker.js
        - manifest.json
        - robots.txt
    
    - name: Copy new files
      copy:
        src: "/tmp/jitsi-meet/{{ item }}"
        dest: "{{ jitsi_deploy_path }}/{{ item }}"
        owner: root
        group: root
        mode: preserve
        remote_src: yes
      loop:
        - libs
        - css
        - static
        - sounds
        - fonts
        - images
        - lang
        - "*.html"
        - "*.js"
        - pwa-worker.js
        - manifest.json
        - robots.txt
    
    - name: Cleanup temporary files
      file:
        path: "{{ item }}"
        state: absent
      loop:
        - /tmp/{{ jitsi_tarball }}
        - /tmp/jitsi-meet
    
    - name: Reload nginx
      systemd:
        name: nginx
        state: reloaded
```

### Option 3: Build Debian Package

**Pros:**
- Proper package management
- Version tracking
- Dependency management
- Standard Debian workflow

**Cons:**
- More complex build process
- Requires build tools on server or CI/CD

**Build Steps:**
```bash
# Install build dependencies
sudo apt-get install -y debhelper

# Build the package
npm install
make
dpkg-buildpackage -A -rfakeroot -us -uc -d
# Creates: jitsi-meet-web_*.deb
```

**Ansible Playbook Example:**
```yaml
---
- name: Deploy Jitsi Meet via Debian Package
  hosts: jitsi_servers
  become: yes
  vars:
    jitsi_package: jitsi-meet-web_*.deb
    jitsi_package_path: /tmp/{{ jitsi_package }}
    
  tasks:
    - name: Upload Debian package
      copy:
        src: "{{ jitsi_package }}"
        dest: "{{ jitsi_package_path }}"
        mode: '0644'
    
    - name: Install package
      apt:
        deb: "{{ jitsi_package_path }}"
        state: present
        update_cache: no
    
    - name: Cleanup package file
      file:
        path: "{{ jitsi_package_path }}"
        state: absent
```

## Important Configuration Files

After deployment, ensure these configuration files are properly set:

1. **`/etc/jitsi/meet/{{ domain }}-config.js`** - Main configuration
2. **`/etc/jitsi/meet/{{ domain }}-interface_config.js`** - UI configuration
3. **`/etc/nginx/sites-available/{{ domain }}`** - Nginx configuration

These files are typically managed separately and should not be overwritten during deployment.

## Complete Ansible Role Example

Create `roles/jitsi-meet-deploy/tasks/main.yml`:

```yaml
---
- name: Check Node.js version
  command: node --version
  register: node_version
  changed_when: false
  failed_when: false
  delegate_to: localhost
  run_once: true

- name: Install dependencies
  npm:
    path: "{{ jitsi_source_dir }}"
    state: present
  delegate_to: localhost
  run_once: true

- name: Build Jitsi Meet
  make:
    chdir: "{{ jitsi_source_dir }}"
    target: all
  delegate_to: localhost
  run_once: true

- name: Create deployment archive
  archive:
    path: "{{ jitsi_source_dir }}/{{ item }}"
    dest: "/tmp/jitsi-deploy-{{ ansible_date_time.epoch }}.tar.gz"
    format: gz
  loop:
    - libs
    - css/all.css
    - "*.html"
    - "*.js"
    - static
    - sounds
    - fonts
    - images
    - lang
    - pwa-worker.js
    - manifest.json
  delegate_to: localhost
  run_once: true
  when: use_archive | default(false)

- name: Deploy files
  # Use one of the deployment methods above
  include_tasks: "{{ deployment_method }}.yml"
```

## Recommendations

1. **For Development/Testing**: Use Option 1 (Direct File Copy) - fastest iteration
2. **For Production**: Use Option 2 (Tarball) - better versioning and rollback
3. **For Enterprise**: Use Option 3 (Debian Package) - proper package management

## Pre-Deployment Checklist

- [ ] Build passes locally (`make` completes successfully)
- [ ] All modifications are committed
- [ ] Configuration files are backed up
- [ ] Nginx configuration is compatible
- [ ] Test deployment on staging first

## Post-Deployment

1. Clear browser cache or use incognito mode
2. Check browser console for errors
3. Verify all features work as expected
4. Monitor server logs: `/var/log/nginx/error.log`, `/var/log/prosody/prosody.log`

## Rollback Procedure

If using backups:
```bash
# Restore from backup
sudo tar -xzf /tmp/jitsi-meet-backup-*.tar.gz -C /
sudo systemctl reload nginx
```

