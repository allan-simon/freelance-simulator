# Guide d'optimisation freelance SASU

Synthèse des stratégies courantes recommandées par les cabinets d'expertise comptable et de gestion de patrimoine pour les freelances en SASU.

## 1. Arbitrage salaire vs dividendes

### Le principe
Le salaire est soumis aux cotisations sociales (~43-45% patronales + ~28% salariales — le simulateur utilise 42% par simplification) mais ouvre des droits (retraite, prévoyance, chômage sous conditions). Les dividendes sont soumis à la flat tax (31,4%) mais n'ouvrent aucun droit social.

**Note** : le président de SASU ne bénéficie pas des taux réduits (maladie 7%, AF 3,45%) ni de la réduction Fillon → ses cotisations patronales sont plus élevées qu'un salarié classique.

### La stratégie courante
- **Salaire "plancher"** : se verser un salaire suffisant pour valider 4 trimestres de retraite et avoir une couverture sociale décente. Minimum ~30-40k€ brut/an.
- **Salaire "optimisé"** : viser la TMI 11% max (éviter la tranche à 30%). Avec conjoint et 2,5 parts, un salaire brut de 50-70k€ reste souvent dans la tranche 11%.
- **Dividendes pour le reste** : tout ce qui dépasse est plus efficace en dividendes (31,4% de flat tax < ~70% de charges totales sur le salaire).

### Le piège
Trop baisser le salaire = moins de droits retraite, moins de couverture prévoyance (IJ calculées sur le salaire), moins de chômage. Le salaire n'est pas qu'un coût.

### Vérification avec le CLI
```bash
# Comparer salaire 40k vs 70k avec le reste en dividendes
node cli.js --step3 --salaireBrut 40000 --divNetsVoulus 60000
node cli.js --step3 --salaireBrut 70000 --divNetsVoulus 30000
```

## 2. Le PER comme levier fiscal

### Le principe
Les versements PER sont déductibles du résultat de la société → réduction de l'IS. L'argent est bloqué jusqu'à 64 ans (sauf cas de déblocage anticipé).

### La stratégie
- Verser le maximum supportable en PER quand le résultat est dans la tranche IS 25% (> 100k€).
- Au-dessus de 100k€ de résultat, chaque euro de PER "économise" 25 centimes d'IS.
- En dessous de 100k€, l'économie n'est que de 15 centimes — moins intéressant.

### Le piège
- Capital bloqué longtemps (28 ans si on a 36 ans).
- Fiscalité à la sortie : IR sur le capital, flat tax sur les plus-values.
- Si les règles changent d'ici là, on subit.
- Ne pas mettre plus que ce qu'on peut se permettre de ne pas toucher pendant des décennies.

### Vérification avec le CLI
```bash
# Impact du PER sur le net net et le patrimoine
node cli.js --step4 --per 0
node cli.js --step4 --per 10000
```

## 3. Capitalisation dans la SASU

### Les véhicules

#### Contrat de capitalisation luxembourgeois (véhicule principal)
- **Pour qui** : SASU avec excédent de trésorerie > 50k€/an
- **Avantage clé** : fiscalité différée (quasiment pas d'IS annuel), super-privilège luxembourgeois
- **Allocation type** : 30% fonds euros (sécurité), 70% UC (ETF monde, PE, immobilier)
- **Rendement cible** : 4-7% long terme
- **Frais** : ~0.5-1%/an (négociable au-delà de 250k€)
- **Minimum d'entrée** : souvent 50-100k€ (Cardif Lux, Lombard, SwissLife Luxembourg)

#### SCPI en usufruit temporaire
- **Pour qui** : diversification immobilière sans les contraintes de gestion
- **Avantage clé** : l'usufruit s'amortit sur la durée (5-10 ans), réduisant le résultat imposable
- **Rendement** : 4-6% de distribution + économie d'IS via amortissement
- **Risque** : illiquidité, dépendance au marché immobilier

#### Réserve de trésorerie
- **Objectif** : 6 mois de net net = matelas de sécurité
- **Placement** : compte à terme, fonds monétaire, livret pro
- **Rendement** : 2-3% (ce n'est pas le but, c'est de la sécurité)

### Répartition par défaut du simulateur
- 65% contrat capi : le moteur de croissance
- 20% SCPI : diversification immobilière
- 15% trésorerie : sécurité

### Vérification avec le CLI
```bash
# Comparer répartitions
node cli.js --step4 --ratioCapi 0.80 --ratioTreso 0.10
node cli.js --step4 --ratioCapi 0.50 --ratioTreso 0.30
```

## 4. Rente perpétuelle vs consommation du capital

### Rente perpétuelle (défaut)
- On ne touche que les "fruits" du capital (4% par an)
- Le capital continue de croître
- Revenus plus modestes mais le patrimoine se transmet
- Formule : `revenu_mensuel = capital × 4% × 0.7 / 12` (0.7 = après fiscalité)
- Sécurisant : même si on vit vieux, on ne manque jamais d'argent

### Consommation du capital
- On amortit le capital jusqu'à un âge cible (ex: 80 ans)
- Formule annuité : `PMT = PV × r / (1 - (1+r)^-n)`
- Revenus nettement plus élevés (souvent 2-3× la rente perpétuelle)
- Risque : si on vit au-delà de l'âge cible, plus rien
- Rien à transmettre

### La règle des 4%
Issue de la "Trinity Study" (1998). Sur un portefeuille diversifié 60/40, retirer 4%/an permet de maintenir le capital sur 30+ ans avec une probabilité de succès > 95%. C'est conservateur.

### Vérification avec le CLI
```bash
node cli.js --step4 --croquerCapital false
node cli.js --step4 --croquerCapital true --ageFin 85
```

## 5. L'horizon temporel : combien d'années de freelance ?

### Le concept
Plus on capitalise longtemps, plus les intérêts composés travaillent. La question clé : "À quel âge puis-je lever le pied sans baisser mon niveau de vie ?"

### Les phases
1. **Freelance plein régime** (36 → objectif) : maximiser revenus + capitalisation
2. **Lever le pied** (objectif → 67) : missions ponctuelles + revenus passifs
3. **Retraite** (67+) : retraite obligatoire + revenus passifs + PER débloqué

### Le tableau de scénarios
Le simulateur teste 17 ratios de distribution (20% → 100% des bénéfices). C'est le curseur fondamental :
- Plus de dividendes maintenant = moins de capital demain
- Moins de dividendes maintenant = plus de rente passive demain

### Vérification avec le CLI
```bash
# Impact de l'âge objectif
node cli.js --step4 --ageObjectif 45
node cli.js --step4 --ageObjectif 55
```

## 6. Comparaison avec le CDI

### Hypothèses du simulateur
- CDI senior équivalent : ~67k€ net/an (~5 583 €/mois)
- Épargne possible en CDI : ~500 €/mois (estimation conservatrice)
- Même rendement d'investissement

### Ce que le CDI apporte en plus
- Sécurité de l'emploi (relative)
- Chômage garanti
- Mutuelle d'entreprise
- Formation professionnelle
- Pas de gestion administrative

### Ce que le freelance SASU apporte en plus
- Revenus 20-100% supérieurs
- Optimisation fiscale (arbitrage salaire/dividendes)
- Capitalisation dans la société (effet levier de l'IS)
- Liberté (clients, horaires, lieu)
- Possibilité de "lever le pied" beaucoup plus tôt

## 7. Points de vigilance

### Fiscaux
- L'option au barème progressif (au lieu de la flat tax) peut être avantageuse si TMI ≤ 11% et gros dividendes — à chiffrer avec l'expert-comptable
- Les SCPI en usufruit temporaire : vérifier que l'amortissement est bien accepté par l'administration fiscale (jurisprudence récente favorable mais surveiller)
- PER : la fiscalité à la sortie dépend du mode (capital vs rente) — anticiper

### Sociaux
- Un salaire trop bas = moins de trimestres validés, pension de retraite réduite
- La prévoyance est calculée sur le salaire brut — important en cas d'arrêt long
- Pas de chômage pour le président de SASU (sauf assurance privée type GSC)

### Patrimoniaux
- Ne pas tout mettre dans la société — diversifier (PEA personnel, immobilier perso)
- Le contrat de capitalisation luxembourgeois a un ticket d'entrée élevé (~50-100k€)
- Penser à la clause bénéficiaire et à la transmission

### Disclaimer
**Ceci est un outil de simulation indicatif.** Les vrais montants dépendent de la situation personnelle exacte. Toujours valider avec :
- Un expert-comptable (pour la fiscalité et les cotisations)
- Un avocat fiscaliste (pour les montages complexes)
- Un conseiller en gestion de patrimoine indépendant (pour l'allocation d'actifs)
