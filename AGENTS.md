# Recordatorios para el agente

## Cada vez que se hagan cambios en el código fuente

1. Ejecutar `npx tsc --noEmit` para verificar tipos
2. Reconstruir y reiniciar Docker automáticamente:
   ```
   docker compose build --no-cache app && docker compose up -d
   ```
3. Informar al usuario que los cambios ya están aplicados en vivo
