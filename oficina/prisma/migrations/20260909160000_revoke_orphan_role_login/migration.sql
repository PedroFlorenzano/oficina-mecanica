-- ============================================================
-- Segurança: revogar LOGIN dos roles operare_app / operare_admin
--
-- A migration 20260605001456_add_rls_policies criou esses roles com senha
-- fixa no código ('operare_app_pwd' / 'operare_admin_pwd'). O repositório é
-- público, então essas senhas estão na internet — e operare_admin foi criado
-- com BYPASSRLS, o que permitiria ler os dados de todos os tenants.
--
-- Nenhuma conexão da aplicação usa esses roles (dev usa "operare" do Docker,
-- CI usa "operare", produção usa o owner do Neon), então remover o direito de
-- login fecha a brecha sem afetar nada em execução.
--
-- Quando o isolamento por RLS for ativado de verdade, o role de runtime será
-- recriado com senha forte vinda de variável de ambiente (nunca no versionado).
--
-- Tudo é best-effort: se o banco não permitir ALTER ROLE, apenas registra um
-- aviso, para nunca quebrar o build/deploy.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'operare_app') THEN
    BEGIN
      ALTER ROLE operare_app NOLOGIN;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Nao foi possivel revogar login de operare_app: %', SQLERRM;
    END;
  END IF;

  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'operare_admin') THEN
    BEGIN
      ALTER ROLE operare_admin NOLOGIN;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Nao foi possivel revogar login de operare_admin: %', SQLERRM;
    END;

    -- Remover BYPASSRLS exige superusuário; no Neon pode falhar e isso é aceitável,
    -- já que sem LOGIN o role não consegue abrir conexão.
    BEGIN
      ALTER ROLE operare_admin NOBYPASSRLS;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Nao foi possivel remover BYPASSRLS de operare_admin: %', SQLERRM;
    END;
  END IF;
END
$$;
