-- DOSPA — rôle applicatif, Row-Level Security et immutabilité du journal d'audit.
-- Le rôle applicatif (dospa_app) n'est ni propriétaire ni BYPASSRLS : les politiques s'appliquent à toutes ses requêtes.
-- Le contexte est posé par transaction via set_config(..., true) dans packages/db (withDbContext).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dospa_app') THEN
    CREATE ROLE dospa_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END $$;

-- Fonctions de contexte -------------------------------------------------------
CREATE OR REPLACE FUNCTION app_tenant_id() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.tenant_id', true), '')::uuid $$;

CREATE OR REPLACE FUNCTION app_user_id() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;

-- Contexte "auth" : réservé au module d'authentification (connexion, sessions, réinitialisation).
CREATE OR REPLACE FUNCTION app_is_auth_context() RETURNS boolean LANGUAGE sql STABLE AS
$$ SELECT coalesce(current_setting('app.context', true), '') = 'auth' $$;

-- Droits -------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO dospa_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO dospa_app;
REVOKE INSERT, UPDATE, DELETE ON "permission" FROM dospa_app;
REVOKE INSERT, DELETE ON "tenant" FROM dospa_app;
REVOKE UPDATE, DELETE ON "audit_log" FROM dospa_app;
REVOKE UPDATE, DELETE ON "login_history" FROM dospa_app;
GRANT EXECUTE ON FUNCTION app_tenant_id(), app_user_id(), app_is_auth_context() TO dospa_app;
REVOKE ALL ON "_prisma_migrations" FROM dospa_app;

-- Politiques RLS -----------------------------------------------------------------
ALTER TABLE "tenant" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_select ON "tenant" FOR SELECT
  USING (id = app_tenant_id() OR id IN (SELECT m.tenant_id FROM "membership" m WHERE m.user_id = app_user_id()));
CREATE POLICY tenant_update ON "tenant" FOR UPDATE
  USING (id = app_tenant_id()) WITH CHECK (id = app_tenant_id());

ALTER TABLE "organization" ENABLE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON "organization"
  USING (tenant_id = app_tenant_id()) WITH CHECK (tenant_id = app_tenant_id());

ALTER TABLE "membership" ENABLE ROW LEVEL SECURITY;
CREATE POLICY membership_select ON "membership" FOR SELECT
  USING (tenant_id = app_tenant_id() OR user_id = app_user_id() OR app_is_auth_context());
CREATE POLICY membership_insert ON "membership" FOR INSERT WITH CHECK (tenant_id = app_tenant_id());
CREATE POLICY membership_update ON "membership" FOR UPDATE
  USING (tenant_id = app_tenant_id()) WITH CHECK (tenant_id = app_tenant_id());
CREATE POLICY membership_delete ON "membership" FOR DELETE USING (tenant_id = app_tenant_id());

ALTER TABLE "app_user" ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_user_select ON "app_user" FOR SELECT
  USING (
    app_is_auth_context()
    OR id = app_user_id()
    OR EXISTS (SELECT 1 FROM "membership" m WHERE m.user_id = "app_user".id AND m.tenant_id = app_tenant_id())
  );
CREATE POLICY app_user_insert ON "app_user" FOR INSERT WITH CHECK (app_is_auth_context());
CREATE POLICY app_user_update ON "app_user" FOR UPDATE
  USING (app_is_auth_context() OR id = app_user_id()) WITH CHECK (app_is_auth_context() OR id = app_user_id());

ALTER TABLE "user_preference" ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_preference_owner ON "user_preference"
  USING (user_id = app_user_id() OR app_is_auth_context())
  WITH CHECK (user_id = app_user_id() OR app_is_auth_context());

ALTER TABLE "role" ENABLE ROW LEVEL SECURITY;
CREATE POLICY role_isolation ON "role"
  USING (tenant_id = app_tenant_id()) WITH CHECK (tenant_id = app_tenant_id());

ALTER TABLE "role_permission" ENABLE ROW LEVEL SECURITY;
CREATE POLICY role_permission_isolation ON "role_permission"
  USING (tenant_id = app_tenant_id()) WITH CHECK (tenant_id = app_tenant_id());

ALTER TABLE "role_assignment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY role_assignment_isolation ON "role_assignment"
  USING (tenant_id = app_tenant_id()) WITH CHECK (tenant_id = app_tenant_id());

ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
CREATE POLICY session_owner ON "session"
  USING (app_is_auth_context() OR user_id = app_user_id())
  WITH CHECK (app_is_auth_context() OR user_id = app_user_id());

ALTER TABLE "password_reset_token" ENABLE ROW LEVEL SECURITY;
CREATE POLICY password_reset_auth_only ON "password_reset_token"
  USING (app_is_auth_context()) WITH CHECK (app_is_auth_context());

ALTER TABLE "login_history" ENABLE ROW LEVEL SECURITY;
CREATE POLICY login_history_select ON "login_history" FOR SELECT
  USING (app_is_auth_context() OR tenant_id = app_tenant_id() OR user_id = app_user_id());
CREATE POLICY login_history_insert ON "login_history" FOR INSERT WITH CHECK (app_is_auth_context());

ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_isolation ON "audit_log"
  USING (tenant_id = app_tenant_id()) WITH CHECK (tenant_id = app_tenant_id());

ALTER TABLE "rate_limit_bucket" ENABLE ROW LEVEL SECURITY;
CREATE POLICY rate_limit_auth_only ON "rate_limit_bucket"
  USING (app_is_auth_context()) WITH CHECK (app_is_auth_context());

-- Journal d'audit append-only, y compris pour le propriétaire -------------------------
CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'dospa: % on % is forbidden (append-only)', TG_OP, TG_TABLE_NAME USING ERRCODE = 'insufficient_privilege';
END $$;

CREATE TRIGGER audit_log_append_only BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER login_history_append_only BEFORE UPDATE OR DELETE ON "login_history"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
