# Security Checklist

- Change `SECRET_KEY` before use outside local development.
- Change seeded passwords after first login.
- Keep the app behind VPN or an internal network.
- Use HTTPS through a reverse proxy before remote access.
- Restrict Postgres port exposure to trusted hosts.
- Schedule daily encrypted backups and verify restore periodically.
- Review audit logs for login failures, exports, and deleted records.
- Do not store evidence unless the officer or agency is legally authorized to process it.
- Use soft delete for operational users. Restrict hard delete to Super Admin only.
- Configure firewall rules and server access logs on the host.
