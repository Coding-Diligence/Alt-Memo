# Alt-Memo — consignes du projet

- Interface et textes en français.
- Application React + TypeScript + Vite, avec Supabase Auth et PostgreSQL pour synchroniser les candidatures entre appareils ; la configuration passe par les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
- Ne jamais utiliser ni exposer une clé Supabase `service_role` côté client. Les données doivent rester protégées par les règles RLS.
- Garder une interface responsive, accessible au clavier et cohérente avec le style Alt-Memo.
- Les logos proviennent du favicon public associé au domaine fourni ; prévoir un fallback textuel si l'image n'existe pas.
