#!/bin/bash

set -e

# Disable all Apache MPMs
a2dismod mpm_event 2>/dev/null || true
a2dismod mpm_worker 2>/dev/null || true
a2dismod mpm_prefork 2>/dev/null || true

# Enable ONLY prefork
a2enmod mpm_prefork

# Start Apache
exec apache2-foreground
