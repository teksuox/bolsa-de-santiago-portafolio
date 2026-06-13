# Recordatorios para el agente

## Resumen del proyecto

Portafolio de inversiones para la Bolsa de Santiago. Permite registrar acciones chilenas, ver precios en vivo desde la BCS API (Yahoo Finance como respaldo), calcular P&L/rentabilidad/dividendos/impuestos, con sincronización a la nube (Supabase, cifrado opcional AES-256) y respaldo local (IndexedDB + JSON). Dockerizado en servidor ARM con Portainer.

## Reglas obligatorias

1. **Backup antes de modificar**: Antes de cualquier modificación al código fuente, crear un commit en git con un mensaje descriptivo que comience con `backup:` para poder revertir si no gusta el resultado.
2. **TypeScript check**: Ejecutar `npx tsc --noEmit` para verificar tipos después de cada cambio.
3. **Reconstruir Docker**: Después de cada cambio en el código fuente, reconstruir y reiniciar Docker automáticamente:
   ```
   docker compose build --no-cache app && docker compose up -d
   ```
4. **Informar al usuario** que los cambios ya están aplicados en vivo.
5. **Responder siempre en español**: Todas las respuestas, explicaciones y mensajes deben ser en español.
