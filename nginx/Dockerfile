# ─────────────────────────────────────────────────────────────────────
# Nginx + ModSecurity WAF + OWASP Core Rule Set (CRS)
#
# Base image: official OWASP ModSecurity CRS (Debian, nginx)
# Includes ModSecurity v3 + CRS 4.x pre-installed.
#
# Tag pinned to a Feb 2026 build for stability.
# To update: find available tags at hub.docker.com/r/owasp/modsecurity-crs
# ─────────────────────────────────────────────────────────────────────
FROM owasp/modsecurity-crs:4-nginx-202602250702

# Remove the default template so the entrypoint does not overwrite our config.
# The OWASP image entrypoint runs envsubst on templates at startup;
# deleting the default template prevents it from clobbering our custom conf.
USER root
RUN chmod u+w /etc/nginx/templates/conf.d/ \
    && rm -f /etc/nginx/templates/conf.d/default.conf.template \
    && rm -f /etc/nginx/conf.d/default.conf

# Copy our custom site config (reverse proxy routes + SSL)
COPY conf.d/ /etc/nginx/conf.d/

# SSL certificates are mounted as a volume from docker-compose.
# They are not baked into the image to avoid including private keys in the build.
