\pset format unaligned
\pset fieldsep '|'
\pset tuples_only on
select 'schemas',            count(*) from pg_namespace where nspname not like 'pg\_%' and nspname<>'information_schema'
union all select 'extensions',        count(*) from pg_extension
union all select 'tables',            count(*) from pg_tables where schemaname not in ('pg_catalog','information_schema')
union all select 'views',             count(*) from pg_views where schemaname not in ('pg_catalog','information_schema')
union all select 'matviews',          count(*) from pg_matviews where schemaname not in ('pg_catalog','information_schema')
union all select 'sequences',         count(*) from pg_sequences where schemaname not in ('pg_catalog','information_schema')
union all select 'indexes',           count(*) from pg_indexes where schemaname not in ('pg_catalog','information_schema')
union all select 'constraints_total', count(*) from pg_constraint c join pg_class r on r.oid=c.conrelid join pg_namespace n on n.oid=r.relnamespace where n.nspname not in ('pg_catalog','information_schema')
union all select 'constraint_p',      count(*) from pg_constraint c join pg_class r on r.oid=c.conrelid join pg_namespace n on n.oid=r.relnamespace where c.contype='p' and n.nspname not in ('pg_catalog','information_schema')
union all select 'constraint_f',      count(*) from pg_constraint c join pg_class r on r.oid=c.conrelid join pg_namespace n on n.oid=r.relnamespace where c.contype='f' and n.nspname not in ('pg_catalog','information_schema')
union all select 'constraint_u',      count(*) from pg_constraint c join pg_class r on r.oid=c.conrelid join pg_namespace n on n.oid=r.relnamespace where c.contype='u' and n.nspname not in ('pg_catalog','information_schema')
union all select 'constraint_c',      count(*) from pg_constraint c join pg_class r on r.oid=c.conrelid join pg_namespace n on n.oid=r.relnamespace where c.contype='c' and n.nspname not in ('pg_catalog','information_schema')
union all select 'rls_policies',      count(*) from pg_policies
union all select 'rls_enabled_tables',count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relrowsecurity and n.nspname not in ('pg_catalog','information_schema')
union all select 'rls_forced_tables', count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relforcerowsecurity and n.nspname not in ('pg_catalog','information_schema')
union all select 'triggers',          count(*) from pg_trigger t join pg_class r on r.oid=t.tgrelid join pg_namespace n on n.oid=r.relnamespace where not t.tgisinternal and n.nspname not in ('pg_catalog','information_schema')
union all select 'functions',         count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname not in ('pg_catalog','information_schema')
union all select 'columns',           count(*) from information_schema.columns where table_schema not in ('pg_catalog','information_schema')
union all select 'migrations_applied',count(*) from drizzle.__drizzle_migrations
union all select 'migration_watermark',coalesce(max(created_at),0)::bigint from drizzle.__drizzle_migrations
order by 1;
