# Bogen-Trainingsturnier Verwaltung 🎯
## Specs
Web-App zur Verwaltung von inoffiziellen Bogenschützen-Trainingsturnieren durch Trainer (als Kampfrichter). Responsiv für Phone, Tablet und Desktop. Modernes Design, Glassmorphism, automatische Umschaltung light/dark mode mit manuellem Override-Toggle.

Zu prüfen: Tech Stack. Diskussion der Nachteile, wenn komplett als Browser-WebApp mit local storage vs. einer gehosteten Installation mit DB. Browser-App müsste so gecachet werden, dass Betrieb auch offline (auf Schießplatz) möglich.

### Betriebs-Phasen:
1. Vor dem Turnier Erfassen der Einstellungen, Klassen und Runden.
2. Vor Schießbeginn am Turnier: Erfassen der Schützen und der Klassen.
3. Während Schießbetrieb: Erfassen der Punkte.
4. Nach Abschluss aller Runden: Anzeige Ergebnislisten.
	- *Version 1.5:* Möglichkeit, die Ergebnisliste als PDF abzuspeichern. Zwei in den Einstellungen konfigurierbare Bilder links und rechts oben auf den PDF-Dokumenten. Weitere Möglichkeit: Erstellung einer PDF-Urkunde für die besten drei/*(n)*/alle  Schützen (konfigurierbar).
	- *Version 2:* Versand der PDF-Urkunden an die Besten *n* per WhatsApp.

Nach Abschluss eines Turniers müssen die Ergebnisse **nicht** persistiert werden (heruntergeladene PDF-Ergebnislisten sind ab *1.5* vorhanden). Zu prüfen wäre die Möglichkeit, 4-8 Turnier-Einstellungen abzuspeichern, um diese schnell erneut abrufen zu können für ein weiteres Turnier.

### Ablauf
**Vorbereitung vor dem Turnier, Phase 1:** 
1. Erfassung der Klassen: Tupel Altersgruppe, Bogenart, Entfernung. Nur eine der Angaben ist Pflicht, die anderen können frei gelassen werden, je nach Anzahl Teilnehmer. Name der Klassen vom Benutzer definierbar, ggf. Vorschlag durch App z.B. RCV-U14 für Recurve unter 14 oder RCV-W-U14.
2. Erfassung Anzahl der Schießlinien (Anzahl)
3. Anzahl der Runden und Passen (Presets nach WA z.B. 1 Runde mit 30 Passen, 2 Runden à 30 Passen, frei anpassbar)

*Version 1.5:* Möglichkeit, vor dem Turnier blanko Schießzettel gemäß dem gewählten Modus auszudrucken (DIN A5, zwei Zettel pro DIN A4-Blatt).

**Turnier, Phase 2:**
Eingabe der Schützen: Name, Klasse, Schießlinie (optional - praktisch bei großer Schützenzahl, weil dann die Ergebnisse anhand der Schießlinien schneller erfasst werden können, als wenn noch der Name der Schützen gesucht werden müsste)).
Während Erfassung: Anzeige, ob Modus AB oder AB/CD (wenn Anzahl Schützen > Schießlinien, dann bei Schießlinie Auswahl AB/CD)

Nach Erfassung: Eingabemaske für die Ergebnisse:

**Phase 3**

**Runde 1:** (Dropdown)
**Passe 1:** (Dropdown)

| Linie | Name  | Klasse  | 1 | 2 | 3 | Summe |
|-------|-------|---------|---|---|---|-------|
| 1     | Max   | RCV-U12 | 9 | 8 | M | 17    |
| 2     | Eva   | Blank-M | 6 | 3 | M | 9     |
| 3     | Kevin | RCV-U16 |   |   |   |       |

[Speichern]

Tabelle durch Klick auf die Spaltenköpfe sortierbar nach Linie, Name, Klasse und Summe.

Klick auf Speichern-Button speichert Ergebnisse zwischen. Eingabemaske erkennt, wenn alle Durchgänge erfasst sind und zeigt dann neben dem Speichern-Button einen [Abschließen] Button, vorher kann Ergebnistabelle weiter korrigiert werden. 

**Phase 4**
Anzeige Ergebnisse. Phone-Display: Klasse per Dropdown auswählbar, dann Anzeige der Ergebnisse nach Punktzahl absteigend sortiert. Andere Displays: ein- oder mehrspaltige Anzeige aller Klassen je nach Bildschirmbreite. Bei Punktgleichheit wird der jeweilige Platz zwei Mal vergeben und der nächste übersprungen.

*Version 1.5:* Download-Link für Ergebnis-Tabellen (bei Bedarf mehrseitig). Download-Links für Urkunden auf Name des Schützen.
