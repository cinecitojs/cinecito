Resumen de evidencia generada durante la auditoría

- Scripts de prueba ejecutados: scripts/socket_client_with_ack.js, socket_client_no_ack.js, socket_client_no_ack_invalid.js
- Resultados clave: join ack exitoso para miembros/owner; join-error/message-error emitidos para clientes sin permisos; mensajes persistidos en DB (IDs impresos en logs durante pruebas).
- health checks: scripts/get_health.js demostró servicios UP (db, redis) durante pruebas.
- Se conservan logs y scripts en el repo en la carpeta /audit_evidence para futura verificación.
