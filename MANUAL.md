# Sersteypan — Notendahandbók

Stjórnkerfi fyrir forsteypuverksmiðju.

---

## Hvernig á að skrá sig inn

1. Opnaðu kerfið í vafra
2. Sláðu inn netfang og lykilorð
3. Smelltu á **Innskrá**
4. Kerfið vísar þér á rétta gátt eftir hlutverki:
   - **Stjórnandi** → `/admin`
   - **Verkstjóri** → `/factory`
   - **Kaupandi** → `/buyer`
   - **Bílstjóri** → `/driver`

Til að skrá sig út: smelltu á **Útskrá** neðst í hliðarvalmyndinni.

---

## Verkflæði

- [Stofna fyrirtæki, verkefni og einingar](#stofna-fyrirtæki-verkefni-og-einingar)
- [Stofna notanda](#stofna-notanda)
- [Greina teikningu með AI](#greina-teikningu-með-ai)
- [Stofna steypulotu og ljúka henni](#stofna-steypulotu-og-ljúka-henni)
- [Uppfæra stöðu einingar](#uppfæra-stöðu-einingar)
- [Skrá og ljúka lagfæringu (galla)](#skrá-og-ljúka-lagfæringu)
- [Stofna afhendingu og hlaða á bíl](#stofna-afhendingu-og-hlaða-á-bíl)
- [Ljúka afhendingu á staðnum](#ljúka-afhendingu-á-staðnum)
- [Fylgjast með verkefni (kaupandi)](#fylgjast-með-verkefni-kaupandi)
- [Óska forgangs á einingu (kaupandi)](#óska-forgangs-á-einingu)
- [Skoða skýrslur](#skoða-skýrslur)
- [Dagleg skráning (dagbók og verkefnalisti)](#dagleg-skráning)

---

## Stofna fyrirtæki, verkefni og einingar

> Hlutverk: **Stjórnandi**

### Skref 1 — Stofna fyrirtæki

Farðu í `/admin/companies` → **+ Nýtt fyrirtæki**

| Reitur | Skylda | Dæmi |
|--------|--------|------|
| Nafn fyrirtækis | ✓ | Borgarnes ehf. |
| Tengiliður | ✓ | Jón Jónsson |
| Tölvupóstur | ✓ | jon@borgarnes.is |
| Kennitala | | 123456-7890 |
| Símanúmer | | +354 555 1234 |
| Heimilisfang, borg, póstnúmer | | |

Smelltu á **Stofna fyrirtæki**.

### Skref 2 — Stofna verkefni

Farðu í `/admin/projects` → **+ Nýtt verkefni**

| Reitur | Skylda | Dæmi |
|--------|--------|------|
| Nafn verkefnis | ✓ | Eddufell 6 |
| Fyrirtæki | ✓ | (velja úr lista) |
| Staða | ✓ | Virkt |
| Lýsing | | |
| Byrjunardagur | | |
| Áætlaður lokadagur | | |

Smelltu á **Stofna verkefni**.

### Skref 3 — Stofna einingar

Farðu í verkefnið → **+ Ný eining** (eða notaðu AI teikningagreiningu, sjá næsta kafla)

| Reitur | Skylda | Dæmi |
|--------|--------|------|
| Nafn | ✓ | F-13 |
| Tegund | ✓ | Filigran |
| Hæð | | 3 |
| Lengd, breidd, hæð (mm) | | 6000, 1200, 200 |
| Þyngd (kg) | | (reiknast sjálfkrafa) |
| Járnauppsetning | | K10 c/c 200 + K12 c/c 300 |
| Forgangur | | 0 (hærra = meiri forgangur) |

Smelltu á **Stofna einingu**.

**Ath:** Ef þú slærð inn mál (lengd × breidd × hæð) reiknar kerfið þyngd sjálfkrafa. Smelltu á **Nota reiknuð þyngd** til að samþykkja.

---

## Stofna notanda

> Hlutverk: **Stjórnandi**

Farðu í `/admin/users` → **+ Nýr notandi**

| Reitur | Skylda | Athugasemd |
|--------|--------|------------|
| Fullt nafn | ✓ | |
| Netfang | ✓ | Verður notandanafn |
| Lykilorð | ✓ | Að minnsta kosti 6 stafir |
| Hlutverk | ✓ | Admin / Verkstjóri / Kaupandi / Bílstjóri |
| Fyrirtæki | ✓* | *Aðeins ef hlutverk = Kaupandi |
| Símanúmer | | |

Smelltu á **Búa til notanda**.

---

## Greina teikningu með AI

> Hlutverk: **Stjórnandi**

Þetta les PDF teikningu og dregur sjálfkrafa út einingar (nöfn, mál, þyngd, járn, magn).

### Skref 1 — Hlaða upp

1. Opnaðu verkefni → **Greina teikningar** (eða farðu beint í `/admin/projects/[id]/analyze-drawings`)
2. Dragðu PDF skjal inn á svæðið, eða smelltu á **Velja skjöl**
3. Smelltu á **Hlaða upp og greina**
4. Bíddu — greining tekur 30–60 sekúndur

Spjald birtist á síðunni sem sýnir stöðu:
- **Í biðröð** → Bíður vinnslu
- **Greining stendur yfir...** → AI les teikninguna
- **Greining lokið** → Tilbúið til yfirferðar
- **Greining mistókst** → Villa birtist á spjaldinu

### Skref 2 — Yfirfara

Smelltu á **Yfirfara** á greiningarspjaldinu.

Tafla birtist með öllum einingum sem AI fann. Hægt er að breyta öllum reitum beint í töflunni:
- Nafn, tegund, bygging, hæð
- Lengd × breidd × hæð (mm)
- Þyngd (reiknuð sjálfkrafa ef vantar)
- Járnauppsetning, magn

**Litakóðar á línum:**
- 🔴 Rautt baksvið = lítið öryggi (AI var óviss)
- 🟡 Gult baksvið = miðlungs öryggi
- 🟠 Appelsínugult = eining með þessu nafni er þegar til

**Öryggismerki** (síðasti dálkur) sýnir hvernig AI mat sjálft sig:
- **Hátt** = AI er öruggt
- **Miðl.** = þarfnast yfirferðar
- **Lágt** = mikil óvissa, farðu vel yfir

### Skref 3 — Stofna einingar

1. Hakið við einingarnar sem á að stofna (allar valdar sjálfgefið)
2. Smelltu á **Stofna valdar einingar (N)**
3. Staðfestu í glugga sem birtist

Hvað gerist:
- Einingar með magn > 1 stækkast (t.d. magn 21 → 21 aðskildar einingar)
- Ef teikning nefnir nýja byggingu sem er ekki til, er hún stofnuð sjálfkrafa
- Staða greiningarinnar breytist í **Staðfest**

---

## Stofna steypulotu og ljúka henni

> Hlutverk: **Verkstjóri**

Steypulota flokkar einingar sem steypast saman.

### Skref 1 — Stofna lotu

Farðu í `/factory/batches` → **Stofna steypulotu**

Gluggi opnast:

**Steypuupplýsingar:**

| Reitur | Dæmi |
|--------|------|
| Steypuverksmiðja | BM Vallá |
| Steypustyrkur | C30/37 |
| Hitastig (°C) | 12.5 |
| Athugasemdir | (frjálst) |

**Velja einingar:**

Flipar flokka einingar eftir tegund: Filigran → Svalir → Stigi → Veggur → o.s.frv.

Innan hvers flipa eru einingar flokkaðar eftir hæð (Hæð 1, Hæð 2...). Hægt að velja allar á hæð í einu.

Aðeins einingar í stöðu **Skipulagt** eða **Járnabundið** birtast.

Smelltu á **Stofna lotu**. Lotunúmer myndast sjálfkrafa (t.d. B-2026-001).

### Skref 2 — Gátlisti

Á lotusíðunni (`/factory/batches/[id]`) er gátlisti sem **verður** að vera fullkláraður:

- ☐ Formolía borin á
- ☐ Járnaskoðun lokið
- ☐ Steypustyrkur staðfestur
- ☐ Hitastig skráð
- ☐ Ívíddir settir
- ☐ Skoðun fyrir steypingu
- ☐ Blöndun staðfest
- ☐ Titringur athugaður
- ☐ Herðingaráætlun tilbúin
- ☐ Öryggisbúnaður
- ☐ Gæðaeftirlit tilkynnt
- ☐ Lokaganga

Hakið við hvern lið. Kerfið skráir hver hakaði og hvenær.

⚠️ **Rauð viðvörun** birtist efst ef gátlisti er ólokinn:
> "Framleiðslustjóri verður að staðfesta alla liði í gátlista áður en steypt er."

### Skref 3 — Ljúka lotu

Þegar allir gátlistaliðir eru hakað, verður hnappurinn **Ljúka steypulotu** virkur.

Staðfestingargluggi birtist:
> "Þetta breytir stöðu allra eininga í lotunni í 'Steypt'. Þessi aðgerð er ekki afturkræf."

Smelltu á **Staðfesta — Ljúka lotu**.

Hvað gerist:
- Staða lotu → **Lokið**
- **Allar einingar í lotunni breytast sjálfkrafa í „Steypt"**
- Tímastimpill skráður

---

## Uppfæra stöðu einingar

> Hlutverk: **Verkstjóri**

Farðu í `/factory/production` → smelltu á einingu → einingaítarsíða.

### Stöður og röð

```
Skipulagt → Járnabundið → Steypt → Þornar → Tilbúið → Á bíl → Afhent
```

Kerfið leyfir aðeins eitt skref í einu. Hægt er að bakka um eitt skref ef villa á sér stað.

### Hvernig

1. Á einingarítarsíðu sérðu fellivalmynd **Ný staða**
2. Veldu næstu stöðu (t.d. Járnabundið → Steypt)
3. Skrifaðu athugasemdir ef þú vilt (valkvæmt)
4. Hlaðið upp mynd ef við á (valkvæmt — myndir tengjast framleiðslustigi)
5. Smelltu á **Uppfæra stöðu**

**Ath:** Steypt-stöðu fær eining sjálfkrafa þegar steypulotu er lokið. Ekki þarf að uppfæra handvirkt.

### Ferilslína (Traceability Timeline)

Á einingarítarsíðu sést lóðrétt ferilslína sem sýnir 9 skref:
1. Stofnuð → 2. Járn → 3. Í lotu → 4. Gátlisti → 5. Steypt → 6. Þurrkun → 7. Tilbúið → 8. Á bíl → 9. Afhent

- Lokið skref = solid hringur með tímastimpli
- Næsta skref = blár hringur, "Næst"
- Framtíð = grár brotinn hringur, "Á eftir"

---

## Skrá og ljúka lagfæringu

> Hlutverk: **Verkstjóri**

### Skrá nýja lagfæringu

Farðu í `/factory/fix-in-factory` → **+ Ný lagfæring**

| Reitur | Skylda | Valmöguleikar |
|--------|--------|---------------|
| Lýsing vandamáls | ✓ | Frjáls texti |
| Grunnorsök | | Hvað olli vandamálinu |
| Flokkur | | Efni / Samsetning / Hönnun / Flutningur / Annað |
| Forgangur | | Lágur / Venjulegur / Hár / Mjög brýnt |
| Hefur áhrif á afhendingu | | Já/Nei hakreitur |

Smelltu á **Skrá lagfæringu**.

**Ef „Hefur áhrif á afhendingu" er hakað:**
- Viðvörun birtist á afhendingaspjöldum
- Bílstjóri varaður við ef hann reynir að hlaða einingu sem á opinn galla

### Myndir

Á lagfæringarspjaldinu geturðu hlaðið upp allt að 5 myndum af gallanum (JPEG/PNG/WebP, max 10MB).

### Ljúka lagfæringu

1. Smelltu á **Ljúka** á lagfæringarspjaldinu
2. Fylltu út:
   - **Hvað var gert til að laga** (skylt)
   - **Hvað má gera betur næst** (valkvæmt)
   - **Aðrar athugasemdir** (valkvæmt)
3. Smelltu á **Merkja sem lokið**

---

## Stofna afhendingu og hlaða á bíl

> Hlutverk: **Bílstjóri**

### Skref 1 — Stofna afhendingu

Farðu í `/driver/deliveries/new`

| Reitur | Skylda | Dæmi |
|--------|--------|------|
| Verkefni | ✓ | (velja úr lista) |
| Bílnúmer | ✓ | AB-123 |
| Lýsing | | Hvítur Volvo |
| Áætluð dagsetning | | (sjálfgefið: í dag) |

Smelltu á **Búa til afhendingu**. Kerfið fer á hleðslusíðuna.

### Skref 2 — Skanna einingar á bíl

Á hleðslusíðu (`/driver/load`):

1. Smelltu á **Skanna einingu til að bæta við**
2. Myndavél opnast — beindu henni að QR kóða á einingunni
3. Ef QR er ólesanlegur: smelltu á **Slá inn númer handvirkt** og leitaðu eftir nafni

**Kerfið athugar:**
- Er einingin í stöðu **Tilbúið**? (ef ekki, er hún hafnað)
- Eru opnir gallar sem stöðva afhendingu?

Ef allt er í lagi sérðu grænt spjald → smelltu á **Hlaða á bíl**.

Endurtaktu fyrir hverja einingu.

### Skref 3 — Hefja akstur

Þegar allar einingar eru á bílnum, smelltu á **Hefja afhendingu (N einingar)**.

**Ónettengdur stuðningur:** Ef nettenging dettur, safnar kerfið aðgerðum í biðröð og sendir þær sjálfkrafa þegar tenging kemst á. Gult borði efst á skjánum sýnir fjölda aðgerða í bið.

---

## Ljúka afhendingu á staðnum

> Hlutverk: **Bílstjóri**

Farðu í afhendinguna → `/driver/deliver/[id]`

### Skref 1 — Merkja komu

Þegar þú ert komin(n) á staðinn, smelltu á **Merkja komu á staðinn**.

### Skref 2 — Staðfesta einingar

Smelltu á hverja einingu til að staðfesta að hún sé rétt afhent. Grænn haki birtist.

### Skref 3 — Ljúka afhendingu

Þegar allar einingar eru staðfestar:

1. **Nafn móttakanda** — Skrifaðu nafn þess sem tekur við (skylt)
2. **Undirskrift** — Viðtakandi undirritar á skjánum (skylt)
3. **Mynd** — Taktu ljósmynd af afhendingunni (valkvæmt)

Smelltu á **Staðfesta afhendingu**.

Hvað gerist:
- Allar einingar merktar **Afhent**
- Afhending merkt **Lokið** með tímastimpli
- Undirskrift og mynd vistuð í kerfi

---

## Fylgjast með verkefni (kaupandi)

> Hlutverk: **Kaupandi**

Kaupandi sér aðeins gögn sem tilheyra sínu fyrirtæki.

### Verkefnayfirlit

Farðu í `/buyer/projects` → smelltu á verkefni.

Verkefnaítarsíða hefur 5 flipa:

**1. Einingar** — Tafla yfir allar einingar, síanleg eftir stöðu. Smelltu á einingu til að sjá:
- Mál og þyngd
- Ferilslínu (tímastimplar allra stöðubreytinga)
- Myndir frá framleiðslu

**2. 3D Yfirlit** — Hæðarteikningar með einingum staðsettum

**3. Afhendingar** — Tímalína afhendinga fyrir þetta verkefni

**4. Skjöl** — Teikningar, armeringsmyndir, steypuskýrslur (síanlegt eftir flokki)

**5. Skilaboð** — Senda skilaboð til verksmiðjunnar, valkvæmt tengt við tiltekna einingu

### Fylgjast með afhendingu

Farðu í `/buyer/deliveries` → smelltu á afhendingu.

Fimm-þrepa tímalína:
```
Áætlað → Í hleðslu → Á leiðinni → Á staðnum → Afhent
```

Þegar afhending er lokið sérðu:
- Nafn viðtakanda
- Undirskrift
- Ljósmynd

---

## Óska forgangs á einingu

> Hlutverk: **Kaupandi**

1. Farðu í verkefni → Einingar flipinn
2. Finndu eininguna → smelltu á **Óska forgangs**
3. Veldu forgangsstig (1–10, hærra = meiri forgangur)
4. Skrifaðu ástæðu (skylt, max 500 stafir)
5. Smelltu á **Senda beiðni**

Beiðnin fer til stjórnanda/verkstjóra. Staða sýnd á einingunni: Í vinnslu / Samþykkt / Hafnað.

---

## Skoða skýrslur

> Hlutverk: **Stjórnandi**

Farðu í `/admin/reports`.

**Tímabil:** 7 dagar / 30 dagar / 90 dagar / Allt

**4 flipar:**

1. **Framleiðsla** — Vikuleg framleiðni, einingar eftir tegund, ferlatímagreining (meðaltími á milli staða, flöskuhálsar)

2. **Afhendingar** — Fjöldi afhendinga, hlutfall á tíma, meðallengd afhendingar

3. **Gæði** — Gallatíðni, gallar eftir flokkum, áhrif á afhendingu, höfnunarhlutfall

4. **Yfirlit** — Tafla yfir virk verkefni með hlutfalli lokins

---

## Dagleg skráning

> Hlutverk: **Verkstjóri**

### Dagbók (`/factory/diary`)

Dagleg framleiðsluskráning.

Smelltu á **+ Ný færsla**:
- Dagsetning (sjálfgefið: í dag)
- Verkefni (valkvæmt)
- Titill (valkvæmt)
- Innihald (skylt)

Smelltu á **Vista færslu**.

### Verkefnalisti (`/factory/todos`)

Persónulegur verkefnalisti.

Smelltu á **+ Nýtt verkefni**:
- Titill (skylt)
- Lýsing (valkvæmt)
- Gjalddagi (valkvæmt)
- Forgangur (valkvæmt)
- Verkefni (valkvæmt)

Merktu lokið: hakið við gátreit. Kerfið skráir hvenær lokið var.

---

## Önnur atriði

### Skjöl og teikningar

Hægt er að hlaða upp skjölum á verkefnaítarsíðum (admin og factory):
- Flokkar: Teikning / Armering / Steypuskýrsla / Annað
- Síanlegt eftir flokki og verkefni

### Skilaboð

Skilaboð eru verkefnatengd. Hægt er að tengja skilaboð við tiltekna einingu — eininganafn birtist sem merkimiði.

- Stjórnandi og verkstjóri: sjá öll skilaboð
- Kaupandi: sér aðeins skilaboð í verkefnum síns fyrirtækis

### Lager (`/factory/stock`)

Grunnbirgðastjórnun: vörur, magn, staðsetning, endurpantanamörk. Viðvörun ef vara fer undir endurpantanamörk.

### QR kóðar

Stjórnandi getur prentað QR kóða fyrir allar einingar á verkefninu (á verkefnaítarsíðu). Bílstjóri skannar þessa kóða til að hlaða einingum á bíl.

---

## Þekkt takmarkanir

- Engar tilkynningar í tölvupósti — notendur verða að vera innskráðir til að sjá tilkynningar
- Enginn útflutningur skýrslna (PDF/Excel)
- Enginn framleiðsludagatal
- Lagerstjórnun vantar innkaupapantanir
- 3D Lab er tilraun, ekki tengt gögnum

---

*Febrúar 2026*
