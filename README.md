# Alt-Memo

Alt-Memo est une application web en français pour centraliser le suivi des candidatures en alternance.

Application : [Alt-Memo](https://coding-diligence.github.io/Alt-Memo/)

## Fonctionnalités

- Ajouter, modifier et supprimer des candidatures.
- Suivre les statuts : En attente, À voir, Accepté et Refusé.
- Choisir librement la date de candidature.
- Enregistrer le site web, l'e-mail et le nom d'un contact pour chaque entreprise.
- Charger le favicon associé au site de l'entreprise, avec un avatar de remplacement si aucun logo n'est disponible.
- Rechercher et filtrer les candidatures, avec quelques indicateurs de suivi.
- Créer un compte sécurisé par e-mail et mot de passe avec Supabase Auth.
- Synchroniser les candidatures dans Supabase entre les appareils, avec accès isolé par compte.
- Importer les anciennes candidatures locales au premier chargement d'un compte cloud encore vide.

## Logo de l'onglet

Placez le fichier PNG de l'icône dans `public/logo.png`. Vite l'utilisera comme favicon en local et sur GitHub Pages.

## Lancer l'application

Prérequis : Node.js et npm installés.

1. Installer les dépendances avec `npm install`.
2. Créer un projet Supabase et exécuter le contenu de `supabase/schema.sql` dans **SQL Editor**.
3. Copier `.env.example` vers `.env.local`, puis renseigner l'URL du projet et la clé publique (`anon`/publishable) depuis les paramètres API Supabase. Ne jamais utiliser la clé `service_role`.
4. Dans Supabase **Authentication → URL Configuration**, ajouter l'URL du site (en local `http://localhost:5173`, en ligne `https://coding-diligence.github.io/Alt-Memo/`) aux URLs autorisées.
5. Démarrer le serveur local avec `npm run dev`.
6. Créer une version de production avec `npm run build`.

## Publication en ligne

Chaque push sur la branche `main` déclenche automatiquement la publication sur GitHub Pages avec GitHub Actions. Pour la première publication, vérifiez dans **Settings → Pages** que la source de déploiement est **GitHub Actions**. Le workflow injecte l’URL du projet et la clé publique Supabase au build ; cette clé est destinée au client web, et les politiques RLS protègent les données.

Les mots de passe sont gérés par Supabase Auth, jamais par Alt-Memo. Les règles RLS du schéma limitent chaque compte à ses propres candidatures. Les anciennes données locales sont importées au premier accès seulement si le compte cloud ne contient encore aucune candidature ; elles restent dans le navigateur comme copie. Ne publiez jamais la clé `service_role` : seule la clé publique est destinée au client web. La récupération des favicons nécessite une connexion internet.
