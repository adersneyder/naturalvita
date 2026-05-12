-- ============================================================
-- Migration: create_email_suppressions
-- Sprint 1 · Migración AWS SES
--
-- Tabla central de direcciones suprimidas. El webhook SNS la
-- popula automáticamente cuando recibe bounces hard o complaints
-- desde AWS SES. sendEmail() consulta esta tabla antes de enviar
-- para excluir direcciones suprimidas.
-- ============================================================

CREATE TABLE IF NOT EXISTS email_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Email suprimido (siempre lowercase)
  email TEXT NOT NULL UNIQUE,

  -- Razón principal de la supresión
  reason TEXT NOT NULL CHECK (reason IN (
    'hard_bounce',          -- Dirección inválida, dominio inexistente, etc.
    'complaint',            -- Usuario marcó como spam
    'unsubscribe',          -- Usuario hizo opt-out vía List-Unsubscribe
    'manual',               -- Admin la suprimió manualmente
    'role_address'          -- info@, support@, etc. (no envíos masivos)
  )),

  -- Sub-razón técnica (ej: NoEmail, MailboxFull, abuse, etc.)
  sub_reason TEXT,

  -- Código de diagnóstico SMTP recibido del MTA destino
  diagnostic_code TEXT,

  -- Origen de la supresión (aws_ses, savia, admin_panel, etc.)
  source TEXT NOT NULL DEFAULT 'aws_ses',

  -- Cuándo se suprimió
  suppressed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Notas adicionales
  notes TEXT,

  -- Timestamps de auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice principal de búsqueda por email
CREATE INDEX IF NOT EXISTS idx_email_suppressions_email
  ON email_suppressions (email);

-- Índice por razón para reporting
CREATE INDEX IF NOT EXISTS idx_email_suppressions_reason
  ON email_suppressions (reason);

-- Índice por fecha para limpieza periódica
CREATE INDEX IF NOT EXISTS idx_email_suppressions_suppressed_at
  ON email_suppressions (suppressed_at DESC);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE email_suppressions ENABLE ROW LEVEL SECURITY;

-- Solo el service_role (backend) puede leer/escribir
-- Los clientes nunca acceden directamente a esta tabla
CREATE POLICY "Service role full access on email_suppressions"
  ON email_suppressions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- Trigger para updated_at automático
-- ============================================================

CREATE OR REPLACE FUNCTION update_email_suppressions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_email_suppressions_updated_at
  BEFORE UPDATE ON email_suppressions
  FOR EACH ROW
  EXECUTE FUNCTION update_email_suppressions_updated_at();

-- ============================================================
-- Función helper: ¿está suprimido este email?
-- Usada por sendEmail() y Savia antes de enviar.
-- ============================================================

CREATE OR REPLACE FUNCTION is_email_suppressed(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM email_suppressions
    WHERE email = LOWER(p_email)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE email_suppressions IS
  'Lista global de emails suprimidos. Poblada automáticamente por webhook SNS de AWS SES (bounces, complaints) y por unsubscribes de Savia. Consultar antes de cada envío para evitar dañar reputación de dominio.';
