# Alt-Memo

Alt-Memo est une application web en français pour centraliser le suivi des candidatures en alternance.

Version en ligne : https://coding-diligence.github.io/Alt-Memo/

## Fonctionnalités

- Ajouter, modifier et supprimer des candidatures.
- Suivre les statuts : En attente, À voir, Accepté et Refusé.
- Choisir librement la date de candidature.
- Enregistrer le site web, l'e-mail et le nom d'un contact pour chaque entreprise.
- Charger le favicon associé au site de l'entreprise, avec un avatar de remplacement si aucun logo n'est disponible.
- Rechercher et filtrer les candidatures, avec quelques indicateurs de suivi.
- Créer un compte local avec adresse e-mail et mot de passe, puis se connecter ou se déconnecter.
- Conserver les données localement dans le navigateur avec `localStorage`.

## Lancer l'application

Prérequis : Node.js et npm installés.

1. Installer les dépendances avec `npm install`.
2. Démarrer le serveur local avec `npm run dev`.
3. Créer une version de production avec `npm run build`.

## Publication en ligne

Chaque push sur la branche `main` déclenche automatiquement la publication sur GitHub Pages avec GitHub Actions. Pour la première publication, vérifiez dans **Settings → Pages** que la source de déploiement est **GitHub Actions**.

Le compte et les données restent sur l'appareil et dans le navigateur utilisé ; ils ne sont pas synchronisés entre appareils. La connexion est uniquement locale au navigateur : ce n'est pas une authentification hébergée, et les comptes ne sont pas partagés entre utilisateurs ou appareils. Le mot de passe est haché côté navigateur, mais cette connexion locale ne remplace pas une authentification sécurisée par serveur pour un site public. La récupération des favicons nécessite une connexion internet.
