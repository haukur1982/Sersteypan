# Handbók Sérsteypunnar: Framvinda og Áfangareikningar

---

## Hvað er nýtt?

Við höfum bætt áfangareikningakerfi (Framvinda) við Sérsteypuna. Þetta þýðir að þú getur rukkað mánaðarlega fyrir framvindu verks í stað þess að gera upp í lokin. Kerfið heldur utan um alla útreikninga — vísitölu, VSK, tryggingarfé og uppsafnað magn.

Hingað til hefur þetta verið gert í Excel eða á pappír, sem þýðir handvirka útreikninga, mistök og erfitt að sanna nákvæmlega hvað var rukkað og hvenær. Nú er þetta allt rekjanlegt í kerfinu — samningurinn frystist eftir fyrsta reikning, kaupandinn getur séð sína reikninga í sínum hluta kerfisins og PDF-skjölin verða til sjálfkrafa.

---

## 1. Hvað eru Áfangareikningar?

Í stórum og dýrum byggingarverkefnum (t.d. upp á hundruðir milljóna sem taka marga mánuði) rukkarðu ekki allt í einu í lokin. Þú rukkar jafnóðum fyrir það sem er búið að gera.

### Hvernig virkar þetta?

Hugsum okkur risaverkefni. Á fyrsta mánuðinum klárar verksmiðjan 30% af svalaeiningunum og veggjunum.

**Mánuður 1:** Þú ferð í kerfið, stofnar „Framvindu 1" og setur inn magnið sem var klárað. Kerfið reiknar út upphæðina (auk vísitölu og VSK) og þú sendir út fyrsta reikninginn. Þú lokar þessum mánuði. Hann er núna frystur.

**Mánuður 2:** Verkið heldur áfram. Nú er búið að klára 55% af verkinu í heildina. Þegar þú stofnar „Framvindu 2" man kerfið nákvæmlega hvað þú rukkaðir í mánuði 1. Þú setur inn það nýja sem kláraðist í þessum mánuði og kerfið reiknar sjálfkrafa út:

- **Klárað hingað til:** 55%
- **Áður rukkað (Mánuður 1):** 30%
- **Til að rukka fyrir þennan mánuð:** 25%

Svo heldur þetta áfram mánuð eftir mánuð. Kerfið heldur utan um „Uppsafnað" frá byrjun verks og tryggir að það sé aldrei rukkað tvisvar fyrir sama hlutinn. Kaupandinn sér líka alltaf tæra mynd af því hvar verkið er statt.

---

## 2. Hvernig kerfið reiknar

Hér eru útreikningarnir sem kerfið framkvæmir sjálfkrafa á hverju tímabili:

```
Samtals tímabilsins        = Magn × Einingaverð (fyrir hverja línu)
────────────────────────────────────────────────────────────────────
Vísitölubætur               = (Núverandi vísitala / Grunnvísitala - 1) × Samtals
Samtals m/vísitölu          = Samtals + Vísitölubætur
────────────────────────────────────────────────────────────────────
Tryggingarfé (ef á við)     = Samtals m/vísitölu × Tryggingarfé %
Eftir tryggingarfé          = Samtals m/vísitölu - Tryggingarfé
────────────────────────────────────────────────────────────────────
VSK                         = Eftir tryggingarfé × VSK hlutfall
────────────────────────────────────────────────────────────────────
HEILDARUPPHÆÐ               = Eftir tryggingarfé + VSK
```

### Dæmi

- Samtals tímabils: 5.000.000 kr.
- Grunnvísitala: 117,6 — Núverandi vísitala: 120,3
- Vísitölubætur: (120,3 / 117,6 − 1) × 5.000.000 = 114.796 kr.
- Samtals m/vísitölu: 5.114.796 kr.
- Tryggingarfé 5%: −255.740 kr.
- Eftir tryggingarfé: 4.859.056 kr.
- VSK 24%: 1.166.174 kr.
- **Heildarupphæð: 6.025.230 kr.**

Þú þarft aldrei að reikna þetta sjálf(ur). Kerfið gerir þetta sjálfkrafa í hvert skipti.

---

## 3. Skref-fyrir-skref: Uppsetning samnings

### Skref 1: Stofna samning

1. Smelltu á **Framvinda** í valmyndinni til vinstri.
2. Finndu verkefnið í listanum og smelltu á **„Setja upp"**.
3. Fylltu út grunnupplýsingarnar:
   - **Grunnvísitala** — vísitalan þegar samningur var gerður (t.d. 117,6)
   - **VSK hlutfall** — sjálfgefið 24%
   - **Tryggingarfé %** — ef samið var um staðgreiðslutryggingu (sjálfgefið 0%)

### Skref 2: Bæta við samningslínum

Samningslínur eru allar einingarnar sem þú ætlar að rukka fyrir. Þær flokkast í:

| Flokkur | Mælieining |
|---------|------------|
| Filigran | m² |
| Svalir | m² eða stk |
| Stigar | stk |
| Svalagangar | m² eða stk |
| Flutningur | ferðir |
| Annað | eftir atvikum |

**Besta leiðin:** Ef einingarnar eru þegar skráðar í verkefnið, smelltu á **„Sækja úr einingum"**. Kerfið skoðar allar einingar verkefnisins, flokkar þær eftir tegund, húsi og hæð og býr sjálfkrafa til samningslínur. Þú þarft aðeins að fylla inn einingaverð.

**Handvirkt:** Smelltu á **„+ Lína"** undir hverjum flokki til að bæta við línu. Smelltu á **„+ Auka"** til að bæta við aukakostnaðarlínu.

### Skref 3: Vista

Smelltu á **„Vista samning"**. Samningurinn er nú virkur og tilbúinn til að stofna fyrsta tímabilið.

---

## 4. Skref-fyrir-skref: Mánaðarleg reikningagerð

### Stofna nýtt tímabil

1. Farðu í **Framvinda** → smelltu á verkefnið.
2. Neðst á síðunni sérðu **„Ný framvinda (nr. X)"**. Smelltu á hnappinn.
3. Fylltu út:
   - **Dagsetningar** — upphaf og lok tímabilsins
   - **Grunnvísitala** — yfirleitt sú sama og í samningi
   - **Vísitala** — núverandi vísitala
4. Smelltu á **„Stofna"**.

Kerfið býr sjálfkrafa til línur fyrir hvert atriði í samningnum og reynir að stinga upp á magni út frá framleiðslugögnunum (hvaða einingar voru steypar á þessu tímabili).

### Vinna með tímabilið

Þú sérð núna vinnublaðið — töflu með öllum samningslínum:

| Dálkur | Útskýring |
|--------|-----------|
| **Verkþáttur** | Nafn línunnar |
| **Magn** | Heildarmagn samnings |
| **Verð** | Einingaverð |
| **Samtals** | Heildarverð samnings |
| **Uppsafn.** | Heildarmagn rukkað hingað til |
| **%** | Hversu mikið er lokið |
| **Rukkað** | Heildarupphæð rukkuð hingað til |
| **Þetta tímab.** | Magn sem þú ert að rukka núna *(breytanlegt)* |
| **Upphæð** | Reiknuð upphæð fyrir þetta tímabil |
| **Athugasemd** | Athugasemdir *(breytanlegt)* |

**Til að breyta:** Sláðu inn magnið í dálkinn „Þetta tímab." fyrir hverja línu. Kerfið reiknar upphæðina sjálfkrafa.

**Sjálfvirk uppástunga:** Smelltu á **„Stinga upp"** til að láta kerfið fylla inn magn út frá steypudagsetningum eininga.

**Lýsing:** Skrifaðu lýsingu sem birtist á PDF reikningnum (kaupandinn sér þetta).

**Innri athugasemdir:** Skrifaðu innri athugasemdir sem aðeins þú sérð (kaupandinn sér þetta ekki).

### Vista eða loka

- **„Vista drög"** — vistar en heldur tímabilinu opnu til breytinga.
- **„Loka framvindu"** — frystir tímabilið. Engar breytingar mögulegar eftir þetta. Ef magn fer yfir 110% af samningi fær þú viðvörun og þarft að staðfesta.
- **„Opna aftur"** — ef þú þarft að leiðrétta lokað tímabil geturðu opnað það aftur.

### Sækja PDF

Smelltu á **„Sækja PDF"**. Kerfið býr til A4 skjal á langsníð með öllum upplýsingum: verkþáttum, magni, vísitölubótum, tryggingarfé, VSK og heildarupphæð. Þetta er reikningurinn sem þú sendir kaupanda.

---

## 5. Viðbætur og aukaverk (Breytingapantanir)

Hvað gerist þegar kaupandi mætir tveimur mánuðum inn í verkið og segir: „Ég vil fá fimmtán auka svalir"?

### Hvernig frystingin virkar

Strax og þú hefur lokað fyrstu framvindunni (nr. 1) frystir kerfið upprunalega grunnsamninginn. Enginn — ekki einu sinni kerfisstjóri — getur breytt grunnlínum samningsins eftir það. Þetta tryggir að aukakostnaður getur aldrei falið sig inni í upprunalegum samningi.

### Stofna viðbót

1. Farðu á verkefnasíðuna í Framvindu.
2. Undir **„Viðbætur"** smelltu á **„Stofna viðbót"**.
3. Gefðu viðbótinni nafn (t.d. „15 auka svalir").
4. Bættu við nýjum línum og fylltu út magn og verð.
5. Þegar tilbúið, smelltu á **„Samþykkja"** — þetta læsir viðbótinni varanlega.

Samþykktar viðbótarlínur birtast sjálfkrafa á öllum framtíðartímabilum, hlið við hlið við upphaflega samninginn. Gagnsætt og rekjanlegt.

---

## 6. Hvað kaupandinn sér

Kaupandinn hefur sinn eigin aðgang að kerfinu. Hér er munurinn:

| | Þú (Stjórnandi) | Kaupandi |
|---|---|---|
| Sjá öll verkefni | Já | Aðeins sín verkefni |
| Setja upp samning | Já | Sér samantekt (ekki breyta) |
| Sjá drög að tímabili | Já | **Nei** — sér aðeins lokaðar framvindur |
| Breyta tímabili | Já (drög) | Nei |
| Sjá innri athugasemdir | Já | **Nei** |
| Sjá lýsingu | Já | Já |
| Loka/opna tímabil | Já | Nei |
| Sækja PDF | Já (hvaða tímabil) | Já (aðeins lokaðar framvindur) |
| Framvindayfirlit | Já | Já (sama yfirlit) |

### Hvað kaupandinn sér nákvæmlega

**Framvindayfirlit:** Kaupandinn sér heildarframvindu verksins — hversu mikið af hverjum verkþætti er lokið, með framvindustiku og prósentum. Hann sér samningslínur, framleidd magn, eftirstöðvar og upphæðir.

**Lokaðar framvindur:** Fyrir hvert lokað tímabil sér kaupandinn fulla töflu með öllum línunum, uppsöfnuðum magnum, prósentum og fjárhæðum. Hann sér vísitöluleiðréttingu, tryggingarfé og VSK sundurliðað í botninum.

**PDF:** Kaupandinn getur sótt PDF af hverri lokaðri framvindu — nákvæmlega sama skjal og þú sendir.

Engin leyndarmál. Kaupandinn sér sömu tölur og þú — bara ekki drögin og ekki innri athugasemdirnar. Þetta skapar traust.

---

## 7. Flæðirit: Allt ferlið í einu

```
UPPSETNING (einu sinni)
   │
   ├── 1. Stofna fyrirtæki (kaupanda)
   ├── 2. Stofna verkefni (tengja við fyrirtæki)
   ├── 3. Skrá einingar (handvirkt eða greina teikningar)
   └── 4. Setja upp Framvindu-samning (Sækja úr einingum → Fylla út verð)
       │
       ▼
MÁNAÐARLEGT (endurtekið)
   │
   ├── 5. Stofna nýtt tímabil (númer, dagsetningar, vísitala)
   ├── 6. Skoða/breyta magni (kerfið stingur upp)
   ├── 7. Vista drög → Fara yfir → Loka framvindu
   ├── 8. Sækja PDF → Senda kaupanda
   │
   └── Kaupandi: Skráir sig inn → Sér framvinduyfirlit → Sækir PDF
       │
       ▼
EF BREYTINGAR (þegar þarf)
   │
   └── 9. Stofna viðbót → Bæta við línum → Samþykkja
       └── Birtist á næstu framvindu sjálfkrafa
```

---

## 8. Algeng spurning

**Hvað ef ég geri mistök á lokaðri framvindu?**
Smelltu á **„Opna aftur"** til að breyta tímabilinu aftur í drög, leiðréttu og lokaðu aftur.

**Hvað ef vísitalan breytist á milli mánaða?**
Þú slærð inn nýja vísitöluna þegar þú stofnar hvert tímabil. Kerfið reiknar mismuninn sjálfkrafa.

**Hvað ef ég rukka of mikið af einni línu?**
Kerfið varar þig við ef magn fer yfir 110% af samningsmagni þegar þú reynir að loka tímabili. Þú getur valið að halda áfram eða leiðrétta.

**Getur kaupandinn séð drög?**
Nei. Kaupandinn sér aðeins lokaðar framvindur. Þú getur unnið í drögum eins lengi og þú vilt án þess að kaupandinn sjái neitt.

**Hvar finn ég PDF skjölin?**
Smelltu á **„Sækja PDF"** á hvaða tímabili sem er. Kerfið býr til skjalið á staðnum og hleður því niður.

---

*Sérsteypan ehf. — Framvindakerfi, útgáfa 1.0*
