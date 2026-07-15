# TimeSheet

Application personnelle pour suivre ses **heures supplémentaires** au quotidien. Disponible en deux distributions :

- **PWA** (web) déployée sur GitHub Pages — s'installe sur l'écran d'accueil iPhone/Android
- **APK Android natif** (via Capacitor) — apporte l'export mail avec **vraie pièce jointe** dans Gmail (impossible en pure PWA sur Chrome Android)

Fonctionnalités communes :

- Saisie avec précision aux minutes
- **Résumé** : total de la semaine et du mois en cours + ratio /8 par entrée
- **Détails** : liste complète groupée par mois + ratio /8 par entrée
- Données stockées **en local** (aucun backend)
- **Export XLSX** : Fichier (téléchargement direct) ou Mail (pièce jointe)
- **Import JSON** (sauvegarde/restauration)
- Fonctionne **hors ligne** une fois installée

## Stack

Vite + React 18 + TypeScript + Tailwind CSS + `vite-plugin-pwa` pour la version web, **Capacitor** pour la version Android native.

## Développement local (web)

```bash
npm install
npm run dev
```

Puis ouvrir `http://localhost:5173`.

Autres commandes :

```bash
npm run build         # bundle de production pour GitHub Pages (base=/TimeSheet/)
npm run build:native  # bundle pour Capacitor (base=/, PWA désactivée)
npm run preview       # sert le bundle de prod localement
npm run typecheck     # vérifie les types TypeScript sans build
npm run sync:android  # build native + sync du projet android/
```

## Déploiement PWA

Le workflow `.github/workflows/deploy.yml` déploie automatiquement sur GitHub Pages à chaque push sur `main` (Settings → Pages → Source : GitHub Actions).

L'app est disponible sur `https://benjaminflorentin.github.io/TimeSheet/`.

## Build Android APK

Le workflow `.github/workflows/android.yml` build automatiquement l'APK à chaque push sur `main`. Pour récupérer l'APK :

1. Aller sur `https://github.com/BenjaminFlorentin/TimeSheet/actions`
2. Cliquer sur le dernier run **Build Android APK**
3. Section **Artifacts** en bas → télécharger `TimeSheet-debug.apk`

### Installer l'APK sur Android

L'APK est en debug (non-signé Play Store). Android affichera un warning "app non vérifiée" — normal.

1. Copier l'APK sur le téléphone (email, USB, Drive…)
2. Paramètres → Sécurité → activer **Sources inconnues** pour l'app qui va installer (navigateur, explorateur de fichiers)
3. Ouvrir l'APK depuis l'explorateur → Installer
4. Ouvrir TimeSheet → tester Exporter → **Mail** → sélectionner Gmail → sujet et pièce jointe pré-remplis

## Installer la PWA (sans APK)

- **iPhone (Safari)** : Partager → Sur l'écran d'accueil
- **Android (Chrome)** : menu → Installer l'app

Sur Android, la PWA n'aura pas la vraie pièce jointe dans Gmail (limite Web Share API sur Chrome). C'est justement pour ça que l'APK existe.

## Sauvegarde des données

Les entrées sont dans `localStorage` — **liées au conteneur** (navigateur pour la PWA, WebView pour l'APK). **Les deux distributions ont des données séparées.** Utiliser régulièrement Exporter → Fichier pour télécharger un XLSX à archiver.
