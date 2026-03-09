FROM mcr.microsoft.com/devcontainers/typescript-node:20

# System tools for hooks and firewall
RUN apt-get update && apt-get install -y --no-install-recommends \
    iptables \
    ipset \
    iproute2 \
    dnsutils \
    jq \
    ripgrep \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Claude Code
RUN npm install -g @anthropic-ai/claude-code

# Harness tooling — installed globally so hooks can call them directly
# These are the deterministic enforcement layer
RUN npm install -g \
    typescript \
    eslint \
    @typescript-eslint/parser \
    @typescript-eslint/eslint-plugin \
    eslint-plugin-import \
    prettier \
    depcheck

# ArchUnit equivalent for TS: ts-arch (structural boundary testing)
RUN npm install -g ts-arch

# Set up non-root user (node user is built into the base image)
ARG USERNAME=node
RUN echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

WORKDIR /workspace
