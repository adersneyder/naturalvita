# Fix · Sprint 2 S0 · Compatibilidad ok/success en SendEmailResult

## Problema
El build de Vercel falló en type-check:

```
./app/(public)/contacto/actions.ts:96:19
Type error: Property 'ok' does not exist on type 'SendEmailResult'.
```

El cliente entregado usaba `success: boolean`, pero el código existente
del repo consume `.ok`.

## Fix
`SendEmailResult` ahora incluye AMBOS campos como alias. Siempre
tienen el mismo valor. Esto preserva compatibilidad con `actions.ts`,
`webhooks/bold/route.ts`, y cualquier otro consumidor pre-existente
sin obligarlos a cambiar.

## Aplicar
1. Reemplaza `lib/email/client.ts` en el repo con el de este ZIP.
2. Commit en GitHub: `Sprint 2 S0 · Fix: compat ok/success en SendEmailResult`.
3. Vercel deploya automáticamente.

Nada más cambia. Variables Vercel, webhook Resend, todo lo demás
sigue igual.
