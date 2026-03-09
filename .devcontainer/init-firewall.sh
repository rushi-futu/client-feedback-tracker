#!/bin/bash
# init-firewall.sh
# Restrict outbound network from the container.
# Agents can only reach what's in the allow list.
# Adapted from Anthropic's reference devcontainer.

set -e

# Allowed outbound domains
ALLOWED_DOMAINS=(
  "api.anthropic.com"      # Claude API
  "registry.npmjs.org"     # npm
  "github.com"             # git operations
  "raw.githubusercontent.com"
  "api.github.com"
  "objects.githubusercontent.com"
)

# Flush existing rules
iptables -F OUTPUT 2>/dev/null || true
iptables -F INPUT 2>/dev/null || true

# Allow loopback
iptables -A OUTPUT -o lo -j ACCEPT
iptables -A INPUT -i lo -j ACCEPT

# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow DNS (needed to resolve allowed domains)
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT

# Resolve and allow each permitted domain
for domain in "${ALLOWED_DOMAINS[@]}"; do
  ips=$(dig +short "$domain" A 2>/dev/null || true)
  for ip in $ips; do
    iptables -A OUTPUT -d "$ip" -j ACCEPT
  done
done

# Allow SSH (for git over SSH)
iptables -A OUTPUT -p tcp --dport 22 -j ACCEPT

# Default deny everything else
iptables -A OUTPUT -j DROP

echo "Firewall initialised. Allowed: ${ALLOWED_DOMAINS[*]}"
