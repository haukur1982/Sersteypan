# Sersteypan — Notendahandbók / User Manual

**Stjórnkerfi fyrir forsteypuverksmiðju**
Management system for a precast concrete factory

---

## Efnisyfirlit / Table of Contents

1. [Innskráning / Login](#1-innskráning--login)
2. [Yfirlit yfir kerfi / System Overview](#2-yfirlit-yfir-kerfi--system-overview)
3. [Stjórnandagátt / Admin Portal](#3-stjórnandagátt--admin-portal)
4. [Verksmiðjugátt / Factory Portal](#4-verksmiðjugátt--factory-portal)
5. [Kaupandagátt / Buyer Portal](#5-kaupandagátt--buyer-portal)
6. [Bílstjóragátt / Driver Portal](#6-bílstjóragátt--driver-portal)
7. [Líftími eininga / Element Lifecycle](#7-líftími-eininga--element-lifecycle)
8. [Líftími afhendinga / Delivery Lifecycle](#8-líftími-afhendinga--delivery-lifecycle)
9. [Steypulotur / Production Batches](#9-steypulotur--production-batches)
10. [AI Teikningagreining / AI Drawing Analysis](#10-ai-teikningagreining--ai-drawing-analysis)
11. [Skilaboðakerfi / Messaging System](#11-skilaboðakerfi--messaging-system)
12. [Skjöl og teikningar / Documents & Drawings](#12-skjöl-og-teikningar--documents--drawings)
13. [Lagfæringar / Fix in Factory](#13-lagfæringar--fix-in-factory)
14. [Lager / Stock Management](#14-lager--stock-management)
15. [Þekkt takmarkanir / Known Limitations](#15-þekkt-takmarkanir--known-limitations)

---

## 1. Innskráning / Login

### Hvernig á að skrá sig inn / How to Log In

1. Opnaðu kerfið í vafra / Open the system in your browser
2. Sláðu inn netfang og lykilorð / Enter your email and password
3. Ýttu á **Innskrá** / Click **Login**
4. Kerfið vísar þér sjálfkrafa á rétta gátt eftir hlutverki / The system redirects you to the correct portal based on your role

### Hlutverk / Roles

| Hlutverk | Role | Gátt / Portal | Slóð / Path |
|----------|------|---------------|-------------|
| Stjórnandi | Admin | Stjórnandagátt | `/admin` |
| Verkstjóri | Factory Manager | Verksmiðjugátt | `/factory` |
| Kaupandi | Buyer | Kaupandagátt | `/buyer` |
| Bílstjóri | Driver | Bílstjóragátt | `/driver` |

### Útskráning / Logout

Smelltu á **Útskrá** hnappinn neðst í hliðarvalmyndinni. / Click the **Logout** button at the bottom of the sidebar.

---

## 2. Yfirlit yfir kerfi / System Overview

Sersteypan stýrir öllu ferli forsteyptra steypuelementa:
Sersteypan manages the complete lifecycle of precast concrete elements:

```
Skipulagt → Járnabundið → Steypt → Þornar → Tilbúið → Á bíl → Afhent
Planned  → Rebar       → Cast   → Curing → Ready   → Loaded → Delivered
```

**Fjórar gáttir** sjá sömu gögn frá mismunandi sjónarhorni:
**Four portals** see the same data from different perspectives:

- **Stjórnandi**: Sér allt, stýrir notendum, fyrirtækjum, verkefnum, skýrslum
- **Verkstjóri**: Stýrir framleiðslu, steypulotum, gátlistum, lager
- **Kaupandi**: Sér sín verkefni, fylgist með framgangi og afhendingum
- **Bílstjóri**: Skannar QR kóða, hleður á bíl, afhendir með undirskrift

---

## 3. Stjórnandagátt / Admin Portal

### 3.1 Stjórnborð / Dashboard (`/admin`)

Yfirlitssíða með helstu tölum verksmiðjunnar.
Overview page with key factory metrics.

**Sýnir / Shows:**
- Fjöldi fyrirtækja, verkefna, notenda, eininga, afhendinga
- Stöðudreifing eininga (sjónrænt) / Element status distribution (visual chart)
- Nýlegar einingar og afhendingar (síðustu 5)
- AI dagleg samantekt framleiðslunnar
- Flýtileiðir: stofna fyrirtæki, verkefni, notanda, eða leita

### 3.2 Fyrirtæki / Companies (`/admin/companies`)

Skrá kaupendafyrirtæki sem panta forsteyptar einingar.
Register buyer companies that order precast elements.

**Aðgerðir / Actions:**
- **Leita** að fyrirtæki (nafn, kennitala, tengiliður) / Search companies
- **Stofna nýtt** fyrirtæki / Create new company
- **Breyta** fyrirtæki (nafn, kennitala, tengiliðaupplýsingar) / Edit company

**Reitir / Fields:** Nafn, kennitala (10 stafir m/ villuleit), tengiliður, netfang, sími, heimilisfang

### 3.3 Verkefni / Projects (`/admin/projects`)

Hvert byggingarverkefni inniheldur einingar, teikningar, afhendingar og skilaboð.
Each construction project contains elements, drawings, deliveries, and messages.

**Verkefnalisti / Project list:**
- Nafn, fyrirtæki, staða, upphafsdagur
- Smelltu á verkefni til að opna ítarsíðu

**Verkefnaítarsíða / Project detail** (`/admin/projects/[id]`):
- **Einingar**: Tafla yfir allar einingar í verkefninu (nafn, tegund, staða, forgangur, hæð)
- **Skjöl**: Hlaða upp teikningum, armeringarmyndum, steypuskýrslum (sjá kafla 12)
- **Hæðarteikningar**: Skoða grunnteikningu með einingum staðsettum á henni
- **QR merki**: Prenta QR kóða fyrir allar einingar í verkefni
- **AI greining**: Hlaða upp PDF teikningu og láta AI draga út einingar (sjá kafla 10)

**Stofna einingu handvirkt / Create element manually** (`/admin/projects/[id]/elements/new`):
- Nafn, tegund, hæð, mál (lengd, breidd, hæð í mm), þyngd, járnauppsetning, forgangur

### 3.4 Notendur / Users (`/admin/users`)

Stýra notendaaðgangi og hlutverkum.
Manage user access and roles.

**Aðgerðir / Actions:**
- **Leita** að notanda (nafn eða netfang) / Search users
- **Sía eftir hlutverki** (Admin, Verkstjóri, Kaupandi, Bílstjóri) / Filter by role
- **Stofna notanda**: Velja hlutverk, fyrirtæki (fyrir kaupendur), setja lykilorð
- **Breyta notanda**: Uppfæra upplýsingar, hlutverk, virkja/óvirkja

### 3.5 Skilaboð / Messages (`/admin/messages`)

Öll skilaboð yfir öll verkefni.
All messages across all projects.

- Sendandi, hlutverk, verkefni, tímastimpill
- Skilaboð geta vísað í tiltekna einingu (sýnt sem merkimiði)

### 3.6 Skýrslur / Reports (`/admin/reports`)

Ítarleg greining á framleiðslu, afhendingum og gæðum.
Detailed analytics on production, deliveries, and quality.

**Tímabil / Time periods:** 7 dagar, 30 dagar, 90 dagar, allt

**Inniheldur / Includes:**
- **Framleiðslumælikvarðar**: Vikuleg framleiðni, einingar eftir tegund
- **Ferlatímagreining**: Meðaltími á milli staða (skipulagt→járnab., járnab.→steypt, o.s.frv.), flöskuhálsgreining
- **Afhendingartölur**: Fjöldi afhendinga, hlutfall á tíma, meðallengd afhendingar
- **Gæðamælikvarðar**: Gallatíðni, gallar eftir flokkum, áhrif á afhendingu, höfnunarhlutfall sjónrænnar skoðunar
- **Framgangur verkefna**: Tafla yfir öll virk verkefni með hlutfalli lokins

### 3.7 Stillingar / Settings (`/admin/settings/element-types`)

Skilgreina tegundir eininga (veggur, filigran, stigi, svalir, o.s.frv.)
Configure element types (wall, filigran, staircase, balcony, etc.)

### 3.8 3D Lab (`/admin/lab/3d`)

⚠️ **Tilraunasíða** — ekki tengd við raunveruleg gögn.
⚠️ **Experimental page** — not connected to production data.

Þrívíddarsandkassi til að skoða steypueiningar með stækkanlegu viðmóti.

---

## 4. Verksmiðjugátt / Factory Portal

### 4.1 Stjórnborð / Dashboard (`/factory`)

Yfirlitssíða verksmiðjunnar.
Factory overview page.

**Sýnir / Shows:**
- **AI dagleg samantekt** framleiðslu
- Í framleiðslu (járnab. + steypt + þurrkun)
- Tilbúið til afhendingar
- Afhent í dag
- Lagervöktun (ef vara undir endurpantanamörkum)
- Opnar lagfæringar (fix in factory)
- **Forgangur** — einingar með forgang > 0 (ekki afhent/á bíl)
- **Fastar einingar** — viðvörun ef eining hefur verið í sömu stöðu of lengi:
  - Skipulagt > 14 dagar, Járnab. > 7 dagar, Steypt > 3 dagar, Þurrkun > 10 dagar, Tilbúið > 14 dagar
- Framleiðsluleiðsla (sjónræn stöng)
- Nýjustu dagbókarfærslur

### 4.2 Framleiðslustjórn / Manage Production (`/factory/manage`)

Sameinað yfirlit yfir framleiðslu á einu verkefni.
Unified production overview for a single project.

**Eiginleikar / Features:**
- **Verkefnaval** — velja á milli virkra verkefna (ef fleiri en eitt)
- **Tölfræði**: Heildareiningar, í steypulotu, steypt eða lengra
- **Virkir gátlistar** — sýnir allar steypulotur í undirbúningi með gátlista
  - Hægt að haka við gátlistaliði beint á síðunni
  - Rauð viðvörun ef gátlisti er ólokinn
- **Einingar eftir tegund** — flipar (Filigran, Svalir, Stigi, Veggur, o.s.frv.)
  - Einingar flokkaðar eftir hæð innan hvers flipa
  - Hægt að fella saman/opna hæðarflokka
  - Hver eining sýnir stöðu, nafn, lotutengingu

### 4.3 Framleiðsla / Production Queue (`/factory/production`)

Listi yfir allar einingar með stöðusíun.
List of all elements with status filtering.

**Aðgerðir / Actions:**
- **Sía eftir stöðu** — t.d. `?status=rebar` sýnir aðeins járnabundnar einingar
- **Leita eftir nafni** — `?search=V101`
- Smelltu á einingu til að opna ítarsíðu

**Einingar ítarsíða / Element detail** (`/factory/production/[elementId]`):
- Uppfæra stöðu einingar (t.d. járnabundið → steypt)
- Skoða allar myndir eftir framleiðslustigi
- Skoða ferilslínu (traceability timeline) — 9 skref, lokið/næst/á eftir
- Skoða lotutengingu (ef eining er í steypulotu)
- Skoða teikningar (einingartengdar + verkefnisteikningar)
- Skoða lagfæringar (ef til)
- Skoða stöðubreytingasögu (element events)

### 4.4 Steypulotur / Batches (`/factory/batches`)

Stjórna steypulotum — sjá kafla 9 fyrir ítarlegri lýsingu.
Manage production batches — see section 9 for detailed description.

**Sýnir / Shows:**
- Lotur í undirbúningi, gátlistafasa, og loknar
- Hvert lotuspjald sýnir: lotunúmer, dagsetning, verkefni, gátlistaframgang, steypustyrkur, einingafjöldi

### 4.5 Áætlun / Schedule (`/factory/schedule`)

Framleiðsluáætlun sýnd eftir verkefnum.
Production schedule shown by project.

**Sýnir / Shows:**
- Yfirlitstöng með fjölda eininga eftir stöðu
- Viðvörun ef einingar eru yfir tímamörkum
- Verkefnaspjöld með:
  - Einingarnet eftir stöðu (6 dálkar)
  - Forgangur auðkenndur með appelsínugult
  - Smelltu á einingu til að opna ítarsíðu

### 4.6 Afhendingar / Deliveries (`/factory/deliveries`)

Afhendingar flokkaðar eftir degi.
Deliveries grouped by date.

**Sýnir / Shows:**
- Í dag, framtíðardagar, liðnir dagar (fellanlegir)
- Spjöld: staða, verkefni, fyrirtæki, bílstjóri, bílnúmer, einingafjöldi
- Viðvörun ef afhending er án bílstjóra

### 4.7 Teikningar / Drawings (`/factory/drawings`)

Miðlægt skjalasafn allra verkefna.
Centralized document library across all projects.

**Síur / Filters:**
- Flokkur: Teikning, Armering, Steypuskýrsla, Annað
- Verkefni: Velja tiltekið verkefni

### 4.8 Verkefni / Projects (`/factory/projects`)

Listi yfir virk verkefni með einingastöðuyfirliti.
List of active projects with element status summary.

Hvert spjald sýnir einingadreifingu: "3 Skipul. · 2 Járnab. · 1 Steypt · 4 Tilb."

**Verkefnaítarsíða** (`/factory/projects/[id]`):
- Einingalisti, stofna steypulotu, hlaða upp skjölum, skilaboð (með einingatengingu)
- Hæðarteikningar með einingastaðsetningu

### 4.9 Dagbók / Diary (`/factory/diary`)

Dagleg framleiðsluskráning.
Daily production logging.

**Aðgerðir / Actions:**
- **Ný færsla**: Titill, efni, valkvæm verkefnatengsl
- **Leita** í dagbók
- **Breyta** fyrri færslur

### 4.10 Verkefnalisti / Tasks (`/factory/todos`)

Persónulegur verkefnalisti verkstjóra.
Personal task list for the factory manager.

**Aðgerðir / Actions:**
- **Ný verkefni**: Titill, lýsing, lokadagur, forgangur, verkefnatengsl
- **Merkja lokið**: Haka við gátreit
- **Breyta/eyða** verkefnum

### 4.11 Lager / Stock (`/factory/stock`)

Birgðastjórnun — sjá kafla 14.
Inventory management — see section 14.

### 4.12 Viðgerðir / Fix in Factory (`/factory/fix-in-factory`)

Galla- og lagfæringarkerfi — sjá kafla 13.
Defect and repair tracking — see section 13.

### 4.13 Skilaboð / Messages (`/factory/messages`)

Skilaboð yfir öll verkefni (verkstjóri sér allt).
Messages across all projects (factory manager sees everything).

---

## 5. Kaupandagátt / Buyer Portal

Kaupandinn sér aðeins gögn sem tilheyra sínu fyrirtæki.
The buyer only sees data belonging to their company.

### 5.1 Stjórnborð / Dashboard (`/buyer`)

- Virk verkefni með framgangsstiku
- Einingar í vinnslu, tilbúnar, afhendingar í bið
- Uppfærist sjálfkrafa (realtime)

### 5.2 Verkefni / Projects (`/buyer/projects`)

Listi yfir verkefni fyrirtækisins með framgangsstiku.

**Verkefnaítarsíða** (`/buyer/projects/[id]`) — 5 flipar:

**Flipi 1: Einingar** — Leitanlegt, sílegt tafla yfir allar einingar
- Smelltu á einingu til að opna ítarglugga:
  - Mál, þyngd, staðsetning
  - Framleiðsluferill með tímastimplum
  - Myndir eftir framleiðslustigi (járnab., steypt, tilbúið, o.s.frv.)
  - Stöðubreytingasaga
- **Biðja um forgang**: Ýttu á hnapp til að senda forgangsósk til verksmiðjunnar

**Flipi 2: 3D Yfirlit** — Þrívídd af hæðarteikningum með staðsettum einingum

**Flipi 3: Afhendingar** — Tímalína afhendinga fyrir þetta verkefni

**Flipi 4: Skjöl** — Teikningar, armeringsmyndir og steypuskýrslur með flokkasíu

**Flipi 5: Skilaboð** — Verkefnatengd skilaboð, hægt að merkja tiltekna einingu

### 5.3 Afhendingar / Deliveries (`/buyer/deliveries`)

Listi yfir afhendingar fyrirtækisins.

**Afhendingarítarsíða** (`/buyer/deliveries/[id]`):
- Fimm-þrepa tímalína: Áætlað → Hleðsla → Á leiðinni → Komið → Afhent
- Upplýsingar um bílstjóra (nafn + sími)
- Listi yfir einingar á bílnum
- Staðfesting afhendingar: viðtakandi, undirskrift, mynd

### 5.4 Skilaboð / Messages (`/buyer/messages`)

Öll skilaboð fyrirtækisins yfir öll verkefni.

### 5.5 Prófíll / Profile (`/buyer/profile`)

- **Breytanlegt**: Fullt nafn, símanúmer
- **Lesaðgangur**: Netfang, hlutverk, fyrirtækjaupplýsingar

---

## 6. Bílstjóragátt / Driver Portal

Hannað fyrir farsíma — stórir hnappar, myndavélastýring, ónettengdur stuðningur.
Designed for mobile — large buttons, camera controls, offline support.

### 6.1 Stjórnborð / Dashboard (`/driver`)

- Stór blár **SKANNA QR KÓÐA** hnappurinn
- Afhendingar í dag, í vinnslu, loknar
- Afhendingalisti

### 6.2 Afhendingar / Deliveries (`/driver/deliveries`)

**Ný afhending** (`/driver/deliveries/new`):
1. Veldu verkefni
2. Sláðu inn bílnúmer og lýsingu
3. Veldu áætlaðan dag
4. Ýttu á "Stofna afhendingu"

### 6.3 Hleðsluferli / Loading Process

**Skref 1: Skanna** (`/driver/load`)
- Opna QR skanna (myndavél símans)
- Skanna QR kóða á einingu
- Kerfið athugar:
  - Er einingin "tilbúin"?
  - Eru opnir gallar sem stöðva afhendingu?
  - Tilheyrir einingin verkefni afhendingarinnar?
- Einingin bætist á bílinn, staða breytist: Tilbúið → Á bíl

**Skref 2: Fjarlægja ef rangt** — Smelltu á X til að fjarlægja einingu af bíl (staða fer aftur: Á bíl → Tilbúið)

**Skref 3: Hefja akstur** — Ýttu á "Byrja akstur" þegar öllum einingum hefur verið hlaðið

### 6.4 Afhendingarferli / Delivery Process

**Staða 1: Á leiðinni** — Afhending er á leið til verkefnisstaðar

**Staða 2: Kominn á staðinn** — Merkja komu

**Staða 3: Ljúka afhendingu** (`/driver/deliver/[id]`):
1. **Staðfesta einingar** — Haka við hverja einingu á bílnum
2. **Fanga undirskrift** — Viðtakandi undirritar á skjánum
3. **Taka mynd** — Ljósmynd af afhendingunni
4. **Nafn viðtakanda** — Skrifa nafn þess sem tekur við
5. **Athugasemdir** (valkvæmt)
6. **Staðfesta** — Allar einingar merktar "Afhent", afhending lokið

### 6.5 QR Skanni / QR Scanner (`/driver/scan`)

- Lifandi myndavélargluggi
- Sjálfvirk greining QR kóða
- Hægt að skipta um myndavél (fram/aftur)
- Sýnir einingaupplýsingar eftir skönnun

### 6.6 Ónettengdur stuðningur / Offline Support

Bílstjóragáttin virkar án internettengingar:
The driver portal works without internet connection:

- Aðgerðir safnast í biðröð (IndexedDB)
- Þegar tenging kemur aftur, eru aðgerðir sendar sjálfkrafa
- Studdur: Bæta einingu á bíl, fjarlægja, staðfesta afhendingu, hefja akstur, ljúka
- Afritun í localStorage til öryggis (iOS Safari)

---

## 7. Líftími eininga / Element Lifecycle

### Stöður / Statuses

| Staða | Status | Litur | Lýsing |
|-------|--------|-------|--------|
| Skipulagt | planned | Grár | Eining stofnuð, bíður framleiðslu |
| Járnabundið | rebar | Gulur | Járnauppsetning í gangi |
| Steypt | cast | Appelsínugulur | Steypt í mót (sjálfkrafa við lok steypulotu) |
| Þornar | curing | Ambergulur | Steypan herðist (yfirleitt 7-28 dagar) |
| Tilbúið | ready | Grænn | Tilbúin til afhendingar |
| Á bíl | loaded | Blár | Hlaðið á flutningabíl |
| Afhent | delivered | Fjólublár | Komin á byggingarsvæði |

### Leyfileg stöðuskipti / Valid Transitions

```
skipulagt → járnabundið → steypt → þornar → tilbúið → á bíl → afhent
```

Hægt er að bakka um eitt skref ef villa á sér stað (t.d. tilbúið → þornar).
It is possible to reverse one step if an error occurs.

### Ferilslína / Traceability Timeline

Á einingarítarsíðu sést 9 skrefa ferilslína:
On element detail page, a 9-step traceability timeline is shown:

1. Stofnuð (Created)
2. Járnauppsetning (Rebar)
3. Í steypulotu (Batch assigned)
4. Gátlisti (Checklist)
5. Steypt (Cast)
6. Þurrkun (Curing)
7. Tilbúið (Ready)
8. Á bíl (Loaded)
9. Afhent (Delivered)

- **Lokið** = solid hringur með lit og tímastimpli
- **Næst** = blár hringur, "Næst" merki
- **Á eftir** = brotinn hringur, grár, "Á eftir" merki

### Sérhver stöðubreyting skráð / Every Status Change Logged

Allar stöðubreytingar vista í `element_events` töflu:
- Hver breytti, hvenær, fyrri staða, ný staða, athugasemdir

---

## 8. Líftími afhendinga / Delivery Lifecycle

### Stöður / Statuses

| Staða | Status | Lýsing |
|-------|--------|--------|
| Skipulögð | planned | Afhending áætluð, bílstjóri úthlutaður |
| Í hleðslu | loading | Einingar verið að hlaða á bíl (fyrsta QR skönnun) |
| Á leiðinni | in_transit | Bíll á leið til verkefnisstaðar |
| Á staðnum | arrived | Bíll kominn á verkefnisstað |
| Lokið | completed | Afhent, undirskrift og mynd móttekin |
| Aflýst | cancelled | Afhending aflýst |

### Afhendingarflæði / Delivery Flow

```
Skipulögð → Í hleðslu → Á leiðinni → Á staðnum → Lokið
   (bílstjóri    (QR skann)    (byrja akstur)  (mæta)  (undirskrift)
    stofnar)
```

### Afhendingarstaðfesting / Delivery Confirmation

Lokið krefst: / Completion requires:
- Allar einingar staðfestar
- Nafn viðtakanda
- Undirskrift á skjá
- Ljósmynd af afhendingu

---

## 9. Steypulotur / Production Batches

Steypulotur flokka einingar sem steypast saman í einu.
Production batches group elements that are cast together.

### Stofna steypulotu / Create Batch

1. Farðu í verkefnaítarsíðu (`/factory/projects/[id]`) eða `/factory/batches`
2. Ýttu á **Stofna steypulotu**
3. **Veldu einingar** — flipar eftir tegund (Filigran, Svalir, Stigi, Veggur, o.s.frv.)
   - Einingar flokkaðar eftir hæð innan hvers flipa
   - Hægt að velja allar á hæð eða í tegund
   - Aðeins einingar í stöðu "Skipulagt" eða "Járnabundið" sjást
4. **Steypuupplýsingar**: Steypuverksmiðja, steypustyrkur (t.d. C30/37), hitastig lofts (°C)
5. **Athugasemdir** (valkvæmt)
6. **Stofna** — lotunúmer sjálfkrafa: `B-2026-001`

### Gátlisti / Checklist

Áður en hægt er að ljúka lotu **verður** að staðfesta alla gátlistaliði:
Before a batch can be completed, **all** checklist items must be confirmed:

- Formolía borin á / Form oil applied
- Járnaskoðun lokið / Rebar inspection complete
- Steypustyrkur staðfestur / Concrete grade verified
- Hitastig skráð / Temperature recorded
- Ívíddir settir / Embedments installed
- Skoðun fyrir steypingu / Pre-cast inspection
- Blöndun staðfest / Mix design confirmed
- Titringur athugaður / Vibrator checked
- Herðingaráætlun tilbúin / Curing plan ready
- Öryggisbúnaður / Safety equipment ready
- Gæðaeftirlit tilkynnt / Quality control notified
- Lokaganga / Final pre-pour walkthrough

Hver liður skráir: hver haki, hvenær.
Each item records: who checked, when.

### Ljúka lotu / Complete Batch

⚠️ **Hnappurinn virkar aðeins ef allir gátlistaliðir eru hakað.**

Þegar lotu er lokið:
When a batch is completed:
1. Staða lotu → "Lokið"
2. **Allar einingar í lotunni breytast sjálfkrafa í "Steypt"**
3. Tímastimpill skráður

### Steypuskýrsla / Concrete Slip

Hlaða upp steypuskýrslu (PDF) á lotusíðu.
Upload concrete specification document (PDF) on batch detail page.

### Viðvörun / Warning

Ef lota er í undirbúningi og gátlisti er ólokinn, sýnir kerfið **rauða viðvörun** á:
- Lotusíðunni
- Lotulista
- Framleiðslustjórnarsíðunni

---

## 10. AI Teikningagreining / AI Drawing Analysis

### Hvernig virkar það / How It Works

1. **Farðu í verkefni** → `/admin/projects/[id]/analyze-drawings`
2. **Hlaðið upp PDF teikningum** — dragðu eða veldu skrár
3. **AI les teikninguna** og dregur út:
   - Einingarnöfn (t.d. D-201, S-01)
   - Tegund (filigran, svalir, stigi, veggur, o.s.frv.)
   - Mál (lengd, breidd, hæð í mm)
   - Þyngd (kg — reiknuð ef ekki á teikningu)
   - Járnauppsetning (t.d. "K10 c/c 200, K10 c/c 250")
   - Magn og hæðardreifing (t.d. "4H: 3stk, 3H: 6stk")
   - Bygging, hæð, framleiðsluathugasemdir
4. **Yfirfara niðurstöður** — tafla með öllum einingum:
   - Öryggismerki (hátt/miðlungs/lágt) sýnir áreiðanleika AI
   - Hægt að **breyta öllum reitum** beint í töflu
   - Þyngd reiknuð sjálfkrafa ef ekki á teikningu
5. **Stofna einingar** — velja einingar og ýta á "Stofna valdar einingar"
   - Einingar með magn > 1 stækkast sjálfkrafa (t.d. 21 stk → 21 einingar)
   - Hæðardreifing virðist (4H: 3stk → 3 einingar á 4. hæð)
   - Nýjar byggingar stofnaðar sjálfkrafa ef þörf

### Stöður greiningar / Analysis Statuses

| Staða | Lýsing |
|-------|--------|
| Í biðröð | Bíður eftir AI vinnslu |
| Greining stendur yfir | AI les teikninguna (30-60 sek) |
| Greining lokið | Tilbúið til yfirferðar |
| Yfirfarið | Manneskja hefur breytt einhverju |
| Staðfest | Einingar stofnaðar í kerfinu |

### Sameinað yfirlit / Combined View

Ef margar teikningar eru greindar, sýnir "Sameinað yfirlit" allar einingar saman með síun eftir tegund og teikningu.

---

## 11. Skilaboðakerfi / Messaging System

### Hvernig á að senda skilaboð / How to Send Messages

Skilaboð eru verkefnatengd — þau sendast í samhengi við tiltekið verkefni.
Messages are project-based — they are sent in the context of a specific project.

**Hvar er hægt að senda / Where to send:**
- Verkefnaítarsíða (hvaða gátt sem er) → Skilaboðaflipi
- Skilaboðasíða (ef hægt er)

**Einingatengsl / Element tagging:**
- Þegar þú sendir skilaboð geturðu valkvæmt tengt við tiltekna einingu
- Eininganafn birtist sem smelljanlegur merkimiði á skilaboðinu
- Gagnlegt til að spyrja um tiltekna einingu (t.d. "Hvenær verður D-201 tilbúin?")

### Hver sér hvað / Who Sees What

- **Stjórnandi**: Sér öll skilaboð í öllum verkefnum
- **Verkstjóri**: Sér öll skilaboð í öllum verkefnum
- **Kaupandi**: Sér aðeins skilaboð í verkefnum síns fyrirtækis
- **Bílstjóri**: Sér ekki skilaboð (ekki hluti af vinnuflæði bílstjóra)

---

## 12. Skjöl og teikningar / Documents & Drawings

### Flokkar / Categories

| Flokkur | Category | Litur |
|---------|----------|-------|
| Teikning | drawing | Blár |
| Armering | rebar | Appelsínugulur |
| Steypuskýrsla | concrete_spec | Grænn |
| Annað | other | Grár |

### Hlaða upp / Upload

1. Farðu í verkefnaítarsíðu
2. Veldu skjal (PDF, mynd, eða annað)
3. Veldu flokk
4. Ýttu á "Hlaða upp"

### Skoða og sía / View and Filter

- `DocumentListWithFilter` gefur síanlegan lista
- Síur: Flokkur, verkefni (á teikningasíðu verksmiðju)
- Smelltu á skjal til að skoða/hlaða niður

---

## 13. Lagfæringar / Fix in Factory

Kerfi til að rekja galla og lagfæringar í framleiðslunni.
System to track defects and repairs in production.

### Skrá lagfæringu / Create Fix Request

1. Farðu á `/factory/fix-in-factory`
2. Ýttu á **Ný lagfæring**
3. Fylltu út:
   - **Lýsing vandamáls** (skylt)
   - **Grunnorsök** — hvað olli vandamálinu
   - **Flokkur**: Efni, Samsetning, Hönnun, Flutningur, Annað
   - **Forgangur**: Lágur, Venjulegur, Hár, Mjög brýnt
   - **Hefur áhrif á afhendingu**: Já/Nei (ef já, kerfið varar við)

### Stöður lagfæringa / Fix Statuses

| Staða | Lýsing |
|-------|--------|
| Í bið | Skráð, engin byrjuð |
| Í vinnslu | Einhver er að vinna í þessu |
| Lokið | Lagfæring klár |
| Hætt við | Aflýst |

### Ljúka lagfæringu / Complete Fix

Þegar lagfæring er kláruð, þarf að skrá:
- **Hvað var gert** til að laga (skylt)
- **Hvað má gera betur** (lessons learned, valkvæmt)
- **Aðrar athugasemdir** (valkvæmt)

### Myndir / Photos

Hægt er að hlaða upp allt að 5 myndum af gallanum (JPEG/PNG/WebP, max 10MB).
Up to 5 defect photos can be uploaded.

### Afhendingarblokkun / Delivery Blocking

Ef lagfæring er merkt "Hefur áhrif á afhendingu" og er ekki lokið:
- Viðvörun birtist á afhendingaspjöldum
- Talning sýnd á lagfæringarsíðu
- Bílstjóri varaður við ef hann reynir að hlaða einingu á bíl sem á opinn galla

---

## 14. Lager / Stock Management

Grunnbirgðastjórnun.
Basic inventory management.

### Eiginleikar / Features

- Listi yfir birgðir (nafn, SKU, flokkur, magn, staðsetning)
- Endurpantanamörk — viðvörun ef magn fer undir
- Inn/út hreyfingar (stock transactions) með eftirlitslínu
- Verkefnaúthlutun — bóka birgðir fyrir tiltekið verkefni

### Takmarkanir / Limitations

- Engin innkaupapöntunarkerfi (purchase orders)
- Engin birgjasamþætting

---

## 15. Þekkt takmarkanir / Known Limitations

| # | Takmörkun | Limitation |
|---|-----------|------------|
| 1 | Engar tilkynningar í tölvupósti | No email notifications for status changes |
| 2 | Engin útflutningur skýrslna (PDF/Excel) | No report export (PDF/Excel) |
| 3 | Enginn framleiðsludagatal | No production scheduling calendar |
| 4 | Lagerstjórnun vantar innkaupapantanir | Stock management lacks purchase orders |
| 5 | 3D Lab er tilraun (ekki tengt gögnum) | 3D Lab is experimental (not connected to data) |
| 6 | Ekkert i18n — íslenskur texti harðkóðaður | No i18n framework — Icelandic strings hardcoded |
| 7 | Realtime tengingar endurreyna ekki sjálfkrafa | Realtime subscriptions lack reconnection retry |

---

*Þessi handbók endurspeglar stöðu kerfisins í febrúar 2026.*
*This manual reflects the system state as of February 2026.*
