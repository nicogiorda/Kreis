# Contracts

Tipos compartidos entre frontend y backend. Sirven para coordinar payloads, DTOs y respuestas del API.

Reglas:

- No importar React ni dependencias de runtime.
- Mantener tipos serializables por JSON.
- Versionar cambios que rompan compatibilidad.
- Evitar meter reglas de negocio aca; eso vive en los modulos.
