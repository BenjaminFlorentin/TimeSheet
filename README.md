# TimeSheet

Application personnelle (PWA, mobile-first) pour suivre ses **heures supplémentaires** au quotidien.

- Saisie avec précision aux minutes
- **Résumé** : total de la semaine et du mois en cours
- **Détails** : liste complète groupée par mois + ratio « /8 » en pourcentage pour chaque entrée (1 journée de 8h = 100%)
- Données stockées **en local sur le téléphone** (aucun backend)
- **Export / Import JSON** pour sauvegarder ou changer d'appareil
- Fonctionne **hors ligne** une fois installée

## Stack

Vite + React 18 + TypeScript + Tailwind CSS + `vite-plugin-pwa`, déployée sur GitHub Pages.

## Développement local

```bash
npm install
npm run dev
```

Puis ouvrir `http://localhost:5173`.

Autres commandes :

```bash
npm run build      # bundle de production dans dist/
npm run preview    # sert le bundle de prod localement
npm run typecheck  # vérifie les types TypeScript sans build
```

## Déploiement

Le workflow `.github/workflows/deploy.yml` déploie automatiquement sur GitHub Pages à chaque push sur `main`.

**Une fois avant le premier déploiement, activer Pages dans le repo :**
Settings → Pages → Source : **GitHub Actions**.

L'app est ensuite disponible sur `https://benjaminflorentin.github.io/TimeSheet/`.

## Installer sur iPhone

1. Ouvrir l'URL de déploiement dans **Safari**
2. Bouton **Partager** → **Sur l'écran d'accueil**
3. L'icône TimeSheet apparaît, l'app se lance en plein écran (mode standalone)

Sur Android, Chrome propose l'installation via son menu.

## Sauvegarde des données

Les entrées sont dans `localStorage` — donc **liées au navigateur** de l'appareil. Utiliser régulièrement le bouton **Exporter** pour télécharger un fichier `timesheet-YYYY-MM-DD.json` (à envoyer par mail à soi-même ou stocker sur iCloud/Drive). Pour restaurer sur un autre appareil : ouvrir la PWA → **Importer** → sélectionner le fichier.
