# NaturalVita · Motor de recomendaciones del quiz — Configuración de secrets

El motor de reclasificación automática ya está desplegado (Edge Function `quiz-reco-sync`
+ dos crons en `pg_cron`). Para que funcione end-to-end, **tú** debes registrar unos
secretos (no los puede manejar Claude por seguridad). Es una sola vez.

## 1. Variables de entorno de la Edge Function

En el panel de Supabase → Project Settings → Edge Functions → `quiz-reco-sync` → Secrets,
agrega:

| Nombre | Valor | Notas |
|--------|-------|-------|
| `ANTHROPIC_API_KEY` | tu clave de la API de Claude (`sk-ant-...`) | La misma que usas para fichas IA |
| `QUIZ_SYNC_SECRET` | un texto aleatorio largo que inventes | Protege la función. Genera con: `openssl rand -hex 32` |
| `QUIZ_SYNC_MODEL` | `claude-opus-4-7` | Opcional. Modelo de clasificación |

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` las inyecta Supabase automáticamente, no las agregues.

## 2. Secretos en Vault (para que el cron invoque la función)

En el SQL Editor de Supabase, ejecuta (reemplazando el valor del secret por el MISMO
que pusiste en `QUIZ_SYNC_SECRET` arriba):

```sql
-- URL del proyecto (para que pg_cron sepa a dónde llamar)
select vault.create_secret('https://qheynvhdjdnqywyaekpq.supabase.co', 'project_url');

-- El mismo secreto que pusiste en la Edge Function
select vault.create_secret('PEGA_AQUI_EL_MISMO_QUIZ_SYNC_SECRET', 'quiz_sync_secret');
```

Si ya existen y quieres actualizarlos:
```sql
select vault.update_secret(
  (select id from vault.secrets where name='quiz_sync_secret'),
  'NUEVO_VALOR'
);
```

## 3. Verificar que funciona

Forzar una corrida manual desde el SQL Editor:
```sql
select public.trigger_quiz_reco_sync('manual_test');
```
Luego revisar el registro:
```sql
select * from public.quiz_reco_sync_runs order by started_at desc limit 5;
```
Debe aparecer una fila con `status='completed'`. Como ahora mismo no hay productos
sucios (todo está sincronizado), dirá que no hay nada que procesar — eso es correcto.

Para probar de verdad: edita la descripción de cualquier producto activo (cambia su
contenido), espera al cron de 15 min o fuerza la corrida, y verás que se reclasifica solo.

## Cómo funciona el recálculo (resumen)

- Agregar / editar / activar / desactivar un producto → un trigger recalcula su
  `reco_content_hash`. Si difiere del `reco_synced_hash`, el producto queda "sucio".
- Cron cada 15 min (`quiz-reco-debounce-sync`) → si hay sucios, invoca la Edge Function,
  que los reclasifica con Claude y los marca sincronizados. Patrón debounce: editar 50
  productos no dispara 50 llamadas, se procesan en lote.
- Cron semanal (`quiz-reco-weekly-sync`, domingo 3am) → red de seguridad.
- Botón en el admin → invoca `trigger_quiz_reco_sync('admin_manual')` para forzar ya.
- Toda corrida queda registrada en `quiz_reco_sync_runs` (auditoría/observabilidad).
