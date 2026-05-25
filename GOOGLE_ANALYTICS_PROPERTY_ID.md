# Comment trouver votre Property ID Google Analytics

## ⚠️ Différence importante

L'API Google Analytics Data API nécessite un **Property ID NUMÉRIQUE** (ex: `123456789`), **PAS** un Measurement ID (ex: `G-XXXXXXXXXX`).

- ❌ **Measurement ID** : `G-XXXXXXXXXX` ou `XXXXXXXXXX` - Utilisé pour le tracking (react-ga4)
- ✅ **Property ID** : `123456789` (uniquement des chiffres) - Utilisé pour l'API Data

## 🔍 Comment trouver votre Property ID numérique

### Méthode 1 : Via Google Analytics (Recommandé)

1. **Connectez-vous à Google Analytics** : https://analytics.google.com/
2. **Allez dans Administration** (icône d'engrenage en bas à gauche)
3. **Sélectionnez votre propriété** dans la colonne "Propriété"
4. **Dans "Informations sur la propriété"**, vous verrez :
   - **ID de mesure** : `G-XXXXXXXXXX` (c'est le Measurement ID, pas celui qu'on cherche)
   - **ID de propriété** : `123456789` (c'est le Property ID numérique qu'il faut !)

### Méthode 2 : Via l'URL de Google Analytics

1. **Connectez-vous à Google Analytics** : https://analytics.google.com/
2. **Allez dans Administration** → **Propriété**
3. **Regardez l'URL** dans la barre d'adresse
4. L'URL devrait ressembler à : `https://analytics.google.com/analytics/web/#/p123456789/`
5. Le **Property ID** est le nombre après `/p` : `123456789`

### Méthode 3 : Via l'API Google Analytics Admin

Si vous avez accès à l'API Google Analytics Admin, vous pouvez lister vos propriétés :

```bash
curl "https://analyticsadmin.googleapis.com/v1beta/properties" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📝 Configuration dans le Dashboard

Une fois que vous avez votre Property ID numérique :

1. **Allez sur votre dashboard** : `/dashboard` → onglet "Stats"
2. **Si vous n'êtes pas connecté**, cliquez sur "Se connecter à Google Analytics"
3. **Dans le champ de configuration** (si visible), entrez votre Property ID numérique
4. **Ou modifiez directement dans le code** :

```typescript
// Dans src/components/DashboardStats.tsx
const defaultGAId = '123456789'; // Remplacez par votre Property ID numérique
```

## 🔧 Mise à jour du code

Si vous voulez stocker le Property ID dans localStorage :

```javascript
// Dans la console du navigateur (F12)
localStorage.setItem('google_analytics_property_id', '123456789');
```

Puis redémarrez le dashboard.

## ⚠️ Erreurs courantes

### Erreur : "valid property ID: XXXXXXXXXX. A numeric Property ID is required"

**Cause** : Vous utilisez un Measurement ID au lieu d'un Property ID numérique.

**Solution** : Trouvez votre Property ID numérique (voir méthodes ci-dessus) et utilisez celui-ci.

### Erreur : "Property ID invalide"

**Cause** : Le Property ID contient des lettres ou des caractères spéciaux.

**Solution** : Le Property ID doit être uniquement des chiffres (ex: `123456789`).

## 📚 Documentation

- [Google Analytics Property ID Documentation](https://developers.google.com/analytics/devguides/reporting/data/v1/property-id)
- [Google Analytics Data API Documentation](https://developers.google.com/analytics/devguides/reporting/data/v1)

## ✅ Checklist

- [ ] Trouvé le Property ID numérique dans Google Analytics
- [ ] Property ID est uniquement des chiffres (ex: `123456789`)
- [ ] Property ID configuré dans le dashboard ou le code
- [ ] Connecté à Google Analytics via OAuth2
- [ ] Les données se chargent correctement
