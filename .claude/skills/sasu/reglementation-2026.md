# Réglementation applicable (2026)

Sources utilisées dans le simulateur. Chaque règle cite d'abord le texte de loi (LegiFrance), puis des sources secondaires explicatives.

## [1] Cotisations patronales ~45%

Le président de SASU est assimilé salarié (régime général) **mais ne bénéficie pas** des taux réduits réservés aux salariés couverts par l'assurance chômage :
- Maladie : **13%** (pas le taux réduit de 7% des salariés)
- Allocations familiales : **5,25%** (pas le taux réduit de 3,45%)
- **Pas de réduction générale Fillon**

Détail des cotisations patronales (salaire ≤ PASS) :

| Cotisation | Assiette | Taux patronal |
|---|---|---|
| Maladie-maternité-invalidité-décès | Totalité | 13,00% |
| CSA (solidarité autonomie) | Totalité | 0,30% |
| Vieillesse plafonnée | Plafond PASS | 8,55% |
| Vieillesse déplafonnée | Totalité | 2,02% |
| Allocations familiales | Totalité | 5,25% |
| AT/MP | Totalité | ~0,50% |
| FNAL | Plafond PASS | 0,10% |
| AGIRC-ARRCO T1 | Plafond PASS | 4,72% |
| CEG T1 | Plafond PASS | 1,29% |
| CET | Totalité | 0,21% |
| Prévoyance décès cadre | Plafond PASS | 1,50% |
| APEC | Totalité | 0,036% |
| Formation professionnelle | Totalité | 0,55% |
| Taxe d'apprentissage | Totalité | 0,68% |
| **Total (sous PASS)** | | **~38,7%** |

Au-delà du PASS (tranche 2 AGIRC-ARRCO à 12,95%), le taux monte. **Taux effectif moyen pour 60k€ brut : ~43-45%.**

Le simulateur utilise **42%** comme approximation simplifiée. C'est légèrement sous-estimé (~2-3 points). Le "54%" qu'on lit parfois (Legalstart) est le même montant exprimé en % du net (54% × net ≈ 42% × brut).

**Sources primaires :**
- [CSS art. L311-3 11°](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006742553) — assimilation du dirigeant de SAS au régime général
- [CSS art. L241-1 et s.](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006073189/LEGISCTA000006156074/) — taux des cotisations patronales
- [CSS art. L241-13](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048861599) — réduction générale Fillon (non applicable au dirigeant)
- [Legisocial — Mandataires sociaux et taux réduit AF](https://www.legisocial.fr/actualites-sociales/1323-les-mandataires-sociaux-ne-peuvent-beneficier-du-taux-reduit-de-cotisations-dallocations-familiales.html)

**Sources secondaires :**
- [Simulateur URSSAF mon-entreprise.fr](https://mon-entreprise.urssaf.fr/simulateurs/sasu)
- [Le coin des entrepreneurs — Pourquoi la protection sociale du président SASU coûte cher](https://www.lecoindesentrepreneurs.fr/pourquoi-protection-sociale-president-sasu-coute-cher/)
- [sas-sasu.info — Charges sociales président SAS SASU](https://sas-sasu.info/charges-sociales-president-sas-sasu/)
- [Legisocial — Taux cotisations URSSAF 2025](https://www.legisocial.fr/reperes-sociaux/taux-cotisations-sociales-urssaf-2025.html)

**Impact** : 1 € de salaire brut coûte ~1,38-1,39 € à la société (superbrut). Le simulateur calcule le taux exact par tranche (PASS).

Taux effectifs calculés par le simulateur :
- 30k€ brut → 38,6% → superbrut 41 594 €
- 48k€ brut (PASS) → 38,6% → superbrut 66 633 €
- 60k€ brut → 38,3% → superbrut 82 998 €
- 80k€ brut → 38,0% → superbrut 110 409 €
- 100k€ brut → 37,8% → superbrut 137 820 €

## [2] Impôt sur les Sociétés (IS) 2026

Taux réduit de 15% jusqu'à **42 500 €** de résultat (PME éligibles). Taux normal de 25% au-delà. Le seuil reste à 42 500 € : l'amendement PLF 2026 (n°I-2531) qui proposait de le relever à 100 000 € a été voté en première lecture à l'Assemblée mais **n'a pas été retenu dans le texte final** de la LF 2026 (LOI n° 2026-103 du 19/02/2026).

**Sources primaires :**
- [CGI art. 219 I](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006303637) — taux de l'IS (15% et 25%)
- [CGI art. 219 I b](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006303637) — conditions du taux réduit PME (CA < 10M€, capital détenu à 75%+ par des personnes physiques)
- [LOI n° 2026-103 du 19/02/2026](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053508155) — LF 2026 (ne contient pas le relèvement du seuil)

**Sources secondaires :**
- [LégiFiscal — Publication LF 2026](https://www.legifiscal.fr/actualites-fiscales/4433-publication-loi-finances-2026.html) — seuil IS PME non mentionné parmi les mesures adoptées
- [economie.gouv.fr — LF 2026 entreprises](https://www.economie.gouv.fr/entreprises/gerer-sa-fiscalite-et-ses-impots/loi-de-finances-2026-ce-qui-change-pour-les-entreprises) — confirme le seuil de 42 500 €

**Impact** : sur 158k€ de résultat, IS = 42 500 × 15% + 115 500 × 25% = 35 250 € (taux effectif ~22,3%).

## [3] Cotisations salariales ~21% (calcul par tranche)

Part salariale : vieillesse de base, AGIRC-ARRCO, CEG, CET, APEC, CSG/CRDS. Les cotisations salariales sont **identiques** pour un président SASU et un cadre CDI (la différence SASU/CDI est uniquement sur les cotisations patronales).

| Cotisation | Assiette | Taux salarial |
|---|---|---|
| Vieillesse plafonnée | Plafond PASS | 6,90% |
| Vieillesse déplafonnée | Totalité | 0,40% |
| AGIRC-ARRCO T1 | Plafond PASS | 3,15% |
| AGIRC-ARRCO T2 | Au-delà du PASS | 8,64% |
| CEG T1 | Plafond PASS | 0,86% |
| CEG T2 | Au-delà du PASS | 1,08% |
| CET | Totalité | 0,14% |
| APEC | Totalité | 0,024% |
| CSG + CRDS | 98,25% du brut | 9,70% |

Taux effectifs calculés par le simulateur :
- 30k€ brut → 21,0% → net 23 699 €
- 48k€ brut (PASS) → 21,0% → net 37 965 €
- 60k€ brut → 20,8% → net 47 540 €
- 80k€ brut → 20,5% → net 63 577 €

**Sources primaires :**
- [CSS art. L241-3](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006742093) — cotisation vieillesse salariale
- [CSS art. L136-1-1](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036393351) — CSG sur revenus d'activité (9,2%)
- [Ord. 96-50 art. 14](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006268513) — CRDS (0,5%)
- [CSS art. L136-2](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036393283) — assiette CSG (98,25% du brut)

**Sources secondaires :**
- [Dougs — Charges sociales SASU](https://www.dougs.fr/blog/charges-sociales-sasu/)
- [Service Public — Cotisations sociales](https://entreprendre.service-public.gouv.fr/vosdroits/F36240)

**Impact** : salaire net ≈ salaire brut × 0,79 (sous PASS). Le simulateur calcule le taux exact par tranche.

## [4] Flat tax 31,4% (PFU) — LFSS 2026

Prélèvement Forfaitaire Unique sur les dividendes : 12,8% d'IR + 18,6% de prélèvements sociaux (CSG capital majorée de +1,4 point par la LFSS 2026).

**Sources primaires :**
- [CGI art. 200 A](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036428081) — PFU 12,8% (option par défaut)
- [CGI art. 158-3-2°](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006307702) — option au barème progressif (abattement 40%)
- [CSS art. L136-7](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033711755) — CSG sur revenus du capital
- [LFSS 2026 (LOI n° 2025-1757 du 30/12/2025)](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000051093200) — majoration CSG capital +1,4pt → total PS 18,6%

**Sources secondaires :**
- [LégiFiscal — PLFSS 2026 flat tax 31,4% adopté](https://www.legifiscal.fr/actualites-fiscales/4320-plfss-2026-flat-tax-314-adopte.html)
- [LégiFiscal — Hausse CSG : placements concernés/exclus](https://www.legifiscal.fr/actualites-fiscales/4369-janvier-2026-hausse-csg-appliquera-certains-placements-financiers.html)
- [Dougs — Flat tax dividendes](https://www.dougs.fr/blog/flat-taxe-dividendes/)

**Note** : l'option au barème progressif (CGI 200 A 2°) avec abattement 40% (CGI 158-3-2°) peut être avantageuse si TMI ≤ 11%. À chiffrer au cas par cas.

**Exclusions** : la hausse de CSG ne s'applique pas à l'assurance-vie, aux PEL, aux revenus fonciers/plus-values immobilières, ni au livret d'épargne populaire. Le traitement du PER (versions assurantielles) reste flou.

## [5] Barème IR 2026 (revenus 2025)

Barème revalorisé de +0,9% (inflation) :

| Tranche | Taux |
|---------|------|
| 0 — 11 600 € | 0% |
| 11 600 — 29 579 € | 11% |
| 29 579 — 84 577 € | 30% |
| 84 577 — 181 917 € | 41% |
| > 181 917 € | 45% |

**Sources primaires :**
- [CGI art. 197 I 1°](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006303211) — barème progressif de l'IR
- [CGI art. 193](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006303191) — quotient familial
- [CGI art. 83 3°](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006302470) — déduction forfaitaire 10% pour frais professionnels
- [LF 2026](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000051093079) — revalorisation des tranches

**Sources secondaires :**
- [Service Public — Barème IR 2026](https://www.service-public.gouv.fr/particuliers/actualites/A18045)
- [Simulateur officiel impots.gouv.fr](https://simulateur-ir-ifi.impots.gouv.fr/calcul_impot/2026/complet/index.htm)

## [6] Chèques-vacances ANCV

Exonérés de cotisations sociales (hors CSG/CRDS) dans la limite de 30% du SMIC mensuel brut par an. En 2026 : 1 823,03 € × 30% = **546,91 €/an** pour un dirigeant sans salarié.

**Attention** : la CSG/CRDS reste due même dans la limite d'exonération.

**Sources primaires :**
- [Code du tourisme art. L411-1 à L411-11](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074073/LEGISCTA000006158495/) — régime des chèques-vacances
- [CSS art. L242-1](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006742031) — assiette des cotisations (exclusion chèques-vacances sous conditions)

**Sources secondaires :**
- [Nexco — Chèques-vacances plafonds 2026](https://www.nexco-expertise.com/cheques-vacances-plafonds-exonerations-2026)
- [economie.gouv.fr — Chèques-vacances](https://www.economie.gouv.fr/entreprises/gerer-ses-ressources-humaines-et-ses-salaries/entreprises-tout-ce-que-vous-devez-savoir)

**Impact** : 540 €/an nets d'impôt et de charges.

## [7] PASS 2026 et IJ Sécu

Plafond Annuel de la Sécurité Sociale 2026 = 48 060 €. IJ maladie = 50% du salaire brut plafonné au PASS.

**Sources primaires :**
- [CSS art. D242-4](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006736054) — fixation du PASS
- [CSS art. R323-4](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006747670) — calcul des IJ maladie (50% du salaire journalier)
- [Arrêté du 22/12/2025](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053143451) — PASS 2026 = 48 060 €

**Sources secondaires :**
- [URSSAF — Plafonds Sécurité sociale](https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/plafonds-securite-sociale.html)
- [Service Public — PASS 2026](https://www.service-public.fr/particuliers/actualites/A15386)
- [ameli.fr — IJ maladie](https://www.ameli.fr/entreprise/vos-salaries/arret-de-travail/indemnites-journalieres)

## [8] PER — déblocage à 64 ans

Plan d'Épargne Retraite bloqué jusqu'à l'âge légal de départ à la retraite (64 ans, générations ≥1969). Versements déductibles du résultat (réduction IS).

Cas de déblocage anticipé : achat résidence principale, invalidité, décès conjoint, surendettement, expiration droits chômage, cessation d'activité non salariée suite à liquidation judiciaire.

**Sources primaires :**
- [Code monétaire et financier art. L224-1 à L224-40](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072026/LEGISCTA000038610278/) — régime juridique du PER
- [CMF art. L224-4](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038612777) — cas de déblocage anticipé
- [CGI art. 154 bis 0 A](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038612620) — déductibilité des versements (TNS)
- [CGI art. 163 quatervicies](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038612610) — plafond de déduction
- [Loi 2023-270 art. 10](https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000047400931) — âge légal à 64 ans (réforme retraites 2023)

**Sources secondaires :**
- [Service Public — PER](https://www.service-public.gouv.fr/particuliers/vosdroits/F34982)
- [Service Public — Réforme retraites](https://www.service-public.gouv.fr/particuliers/actualites/A18825)

**Note** : la réforme retraites a été "suspendue" politiquement en 2025 mais l'âge légal reste à 64 ans tant qu'aucune nouvelle loi n'est votée. À surveiller.

## [9] Contrat de capitalisation luxembourgeois

Enveloppe d'investissement souscrite par la société (personne morale à l'IS).

- **Super-privilège** : actifs ségrégués chez un dépositaire tiers (triangle de sécurité)
- **Fiscalité IS** : seule la part forfaitaire (105% du TME) est imposée annuellement
- **Liquidité** : rachat partiel ou total à tout moment
- **Transmission** : pas de limite de durée, transmissible

**Sources primaires :**
- [Code des assurances art. L134-1 à L134-5](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006073984/LEGISCTA000006157241/) — contrat de capitalisation (droit français)
- [CGI art. 238 septies E](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006304019) — fiscalité IS des contrats de capitalisation (base forfaitaire = 105% TME)
- [Loi luxembourgeoise du 6/12/1991 sur le secteur des assurances](https://legilux.public.lu/eli/etat/leg/loi/1991/12/06/n1/jo) — super-privilège et triangle de sécurité
- [Règlement CSSF 15/03](https://www.cssf.lu/fr/Document/reglement-cssf-n-15-03/) — règles prudentielles assureurs luxembourgeois

**Sources secondaires :**
- [Arkefact — Contrat de capitalisation luxembourgeois](https://arkefact.com/contrat-de-capitalisation-luxembourgeois/)
- [Rothschild & Co — Contrat capi PM à l'IS](https://www.rothschildandco.com/fr/actualites/publications/2025/01/rothschild-martin-maurel--le-contrat-de-capitalisation-souscrit-par-une-personne-morale-soumise-a-limpot-sur-les-societes/)

**Impact** : véhicule principal de capitalisation (65% du reste SASU par défaut). Rendement typique 4-7% selon allocation.

## [10] Estimation retraite (base + complémentaire AGIRC-ARRCO)

Le simulateur estime la pension de retraite à 67 ans (taux plein automatique) en deux composantes :

### Retraite de base (régime général)
- **SAM** (Salaire Annuel Moyen) = moyenne des 25 meilleures années, plafonnées au PASS
- **Pension mensuelle** = SAM × 50% × min(1, trimestres cotisés / 172) / 12
- Trimestres requis : **172** (43 ans) pour les générations ~1990
- 4 trimestres validés par an si salaire annuel ≥ 600 SMIC horaire (~6 990 €)
- À 67 ans : taux plein automatique (50%), mais le prorata durée s'applique toujours

### Retraite complémentaire AGIRC-ARRCO
- **Taux de calcul des points** (taux contractuel, hors coefficient d'appel 127%) :
  - Tranche 1 (≤ PASS) : **6,20%**
  - Tranche 2 (> PASS, ≤ 8×PASS) : **17,00%**
- **Prix d'achat du point** (2024) : **19,6321 €**
- **Valeur de service du point** (2024) : **1,4159 €**
- Points par an = salaire_T1 × 6,20% / 19,6321 + salaire_T2 × 17,00% / 19,6321
- Pension complémentaire mensuelle = total points × 1,4159 / 12

### Hypothèses du simulateur
- Début de carrière à **22 ans** (déduit de l'âge actuel)
- Avant freelance : salaire brut CDI configurable (défaut 45 000 €)
- Pendant freelance : salaire brut SASU (paramètre existant)
- Pas de cotisation après `ageObjectif` (arrêt d'activité)
- Pas de malus temporaire AGIRC-ARRCO (supprimé depuis 2023 pour départ à 67 ans)

**Sources primaires :**
- [CSS art. R351-29](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006750419) — calcul du SAM (25 meilleures années)
- [CSS art. L351-1](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006742476) — pension de base, taux plein à 67 ans
- [CSS art. R351-27](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006750415) — durée d'assurance requise (172 trimestres)
- [ANI du 17/11/2017](https://www.agirc-arrco.fr/fileadmin/agircarrco/documents/conventions-accords/ANI_17-11-2017.pdf) — régime unifié AGIRC-ARRCO

**Sources secondaires :**
- [Service Public — Calcul pension retraite base](https://www.service-public.fr/particuliers/vosdroits/F21552)
- [CNAV — Salaire annuel moyen](https://www.legislation.cnav.fr/Pages/bareme.aspx?Nom=salaire_annuel_moyen_702)
- [AGIRC-ARRCO — Valeur du point](https://www.agirc-arrco.fr/mes-services-particuliers/les-experts-retraite/valeur-du-point/)
- [Service Public — Durée d'assurance requise](https://www.service-public.fr/particuliers/vosdroits/F35063)

**Impact** : pour un profil CDI 45k€ (14 ans) + SASU 60k€ (14 ans), estimation ~1 920 €/mois à 67 ans. La pension réagit au salaire brut CDI, au salaire brut SASU, à l'âge actuel et à l'âge objectif.

## Résumé des taux clés

| Paramètre | Valeur 2026 | Texte de référence |
|-----------|-------------|-------------------|
| Cotisations patronales | ~38-39% du brut (calcul exact par tranche) | CSS L241-1 et s. |
| Cotisations salariales | ~28% du brut | CSS L241-2, L241-3, L136-1-1 |
| IS taux réduit | 15% (≤ 42 500 €) | CGI 219 I b |
| IS taux normal | 25% (> 42 500 €) | CGI 219 I |
| Flat tax (PFU) | 31,4% | CGI 200 A + CSS L136-7 |
| IR tranche max | 45% (> 181 917 €/part) | CGI 197 I 1° |
| PASS | 48 060 € | CSS D242-4 |
| Âge légal retraite | 64 ans | Loi 2023-270 art. 10 |
| Chèques-vacances | 546,91 €/an exonérés (hors CSG/CRDS) | Code tourisme L411-1 |
| Capi lux fiscalité IS | 105% TME | CGI 238 septies E |
| Retraite base | SAM × 50% × prorata | CSS L351-1, R351-29 |
| AGIRC-ARRCO point achat | 19,6321 € (2024) | ANI 17/11/2017 |
| AGIRC-ARRCO point service | 1,4159 € (2024) | ANI 17/11/2017 |
| Trimestres requis (~1990) | 172 (43 ans) | CSS R351-27 |
