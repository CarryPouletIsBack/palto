---
name: enlever
description: >-
  Supprime du code mort ou des branches UI devenues impossibles (paiement, TVA,
  sections masquées) et corrige les erreurs TypeScript TS2367 « no overlap » dans
  le JSX. Utiliser quand l'utilisateur demande d'enlever/retirer une fonctionnalité,
  de masquer des erreurs de comparaison de types, ou invoque /enlever.
disable-model-invocation: true
---

# Enlever (nettoyage + types)

## Ne pas faire

- Pas de `@ts-ignore`, `@ts-expect-error`, ni `// @ts-nocheck` pour faire taire TS2367.
- Pas de `as any` sur les unions de sections/onglets.
- Ne pas désactiver `strict` dans `tsconfig` pour un seul fichier bruyant.

## Symptôme typique

Après avoir retiré ou conditionné une branche (`payment`, `wallet`, TVA, etc.), TypeScript signale :

> This comparison appears to be unintentional because the types '"privacy" | "help"' and '"payment"' have no overlap.

Causes fréquentes :

1. **Rétrécissement dans le JSX** : un `section === 'payment' ? … : (…)` exclut `'payment'` dans la branche `else`, mais des ternaires imbriqués comparent encore `'payment'`.
2. **Handlers incomplets** : un `onKeyDown` sans la branche `payment` alors que le `onClick` l’a — le analyseur peut propager un type trop étroit aux siblings JSX.
3. **Bloc conditionnel** : `{section !== 'security' ? …}` rend les comparaisons à `'security'` mortes à l’intérieur.

## Correctifs (par ordre de préférence)

### 1. Sous-composant avec union rétrécie

```tsx
{section === 'payment' ? (
  <PaymentPanel … />
) : (
  <AccountManageGrid section={accountManageSection} … />
)}
```

Déclarer `section: Exclude<AccountManageSectionId, 'payment'>` sur le sous-composant.

### 2. `switch` exhaustif (helpers)

Extraire titres, libellés, icônes dans des fonctions :

```ts
function accountCard1Title(section: AccountManageSectionMain, isEn: boolean): string {
  switch (section) {
    case 'personal': return '…';
    case 'security': return '…';
    case 'privacy': return '…';
    case 'help': return '…';
  }
}
```

Types dérivés : `Exclude<Union, 'payment'>`, puis `Exclude<…, 'security'>` pour les tuiles sans onglet sécurité.

### 3. Supprimer les branches mortes

Si la branche `else` exclut déjà `'payment'`, **retirer** les ternaires `=== 'payment'` et le texte associé — ne pas les laisser « au cas où ».

## Checklist

- [ ] Grep `=== 'payment'`, `TVA`, `HT`, `TTC` dans le périmètre modifié.
- [ ] i18n : retirer « (TTC) », « incl. tax », lignes HT/TVA au récap.
- [ ] `read_lints` sur les fichiers touchés — viser **0 erreur** (warnings préexistants OK).
- [ ] `npm run build` si le changement touche le checkout ou le compte client.

## Palto (références)

- Mode espèces : `cashOnlyPaymentsEnabled()` → `paymentFeaturesEnabled` dans `ClientCompteDashboard.tsx`.
- Grille compte : `ClientAccountManageGrid` + helpers `accountCard*`.
- Checkout Go : `SingleProjectNew.tsx`, libellés `search.checkout*` dans `LanguageContext.tsx`.
