# Kapazitäts-Dashboard (Samedi-Kalender)

Prototyp aus dem Mini-Hackathon beim Ophthalmologen-Kongress (25.–26.09.2026).

**Live:** https://niclasbayer.github.io/kapazitaets-dashboard/

Samedi zeigt pro Tag nur eine prozentuale Ampel, aber keine konkreten Zahlen. Dieses
Dashboard vergleicht die manuell geplanten Wocheneinheiten (1 Einheit = 30 Min) mit dem
CSV-Export der Termine und zeigt wochenweise Delta und Auslastung — als Zahl, Prozent,
Ampel und Balkendiagramm, mit Detailansicht je Woche.

Eine Beispiel-CSV wird beim Start automatisch geladen; eigene CSVs können hochgeladen
werden (`;` oder `,`, Spalten werden über die Namen erkannt).

React + Vite, die CSV wird komplett im Browser ausgewertet. Alle Beispieldaten sind
**synthetisch** — keine echten Patientendaten.

Lokal starten: `npm install && npm run dev` → http://localhost:8080
