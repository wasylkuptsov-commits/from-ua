# 🛍️ Platforma Zamówień B2B i Centrala Porównywarki Cen

Nowoczesna platforma internetowa (PWA) łącząca **Katalog Klienta** do składania zamówień hurtowych i detalicznych z zabezpieczonym kodem PIN **Pulpitem Zarządzania PIM (Centralą Hurtowni)**.

---

## 🌟 Główne Funkcjonalności

### 1. Widok Klienta (`index.html`)
* **Czysty interfejs sklepowy:** Przejrzysty katalog towarów ze zdjęciami studyjnymi HD (3D packshoty).
* **Wyszukiwarka i Kapsułki Kategorii:** Błyskawiczne filtrowanie asortymentu w ułamku sekundy.
* **Wielokanałowe Zamówienia z Koszyka:**
  * Wysyłka formularza e-mail z **automatycznym dublowaniem na WhatsApp**.
  * Szybkie zamówienie przez WhatsApp.
  * Pobieranie pliku zamówienia oraz natychmiastowy druk formatu A4.
* **PWA (Progressive Web App):** Możliwość zainstalowania aplikacji 1-kliknięciem na smartfonach Android i iPhone bez konieczności pobierania ze sklepu App Store / Google Play.

### 2. Panel Właściciela PIM (`admin.html`)
* **Bramka Bezpieczeństwa:** Ekran blokady chroniony 4-cyfrowym kodem PIN (domyślny kod: `1234`).
* **Porównywarka Ofert Hurtowni:** Zestawienie cen zakupu netto, marż i stawek VAT od wielu dostawców.
* **Kwarantanna i Narzędzia PIM:** Scalanie duplikatów, asystent agenta AI, kalkulator reguł marżowych.
* **Zarządzanie B2B & CRM:** Baza hurtowni, dni dostaw, minimalne kwoty zamówień.

---

## 🚀 Jak opublikować na GitHub Pages?

1. Utwórz nowe repozytorium na [GitHub.com](https://github.com/new) (np. `katalog-b2b`).
2. Wgraj pliki do repozytorium:
   ```bash
   git init
   git add .
   git commit -m "Wdrożenie Katalogu B2B i Panelu PIM"
   git branch -M main
   git remote add origin https://github.com/TWOJA_NAZWA/katalog-b2b.git
   git push -u origin main
   ```
3. Przejdź w repozytorium do **Settings** -> **Pages**:
   * W sekcji **Branch** wybierz `main` i kliknij **Save**.
4. Po ok. 30 sekundach Twoja strona będzie dostępna pod adresem:
   `https://TWOJA_NAZWA.github.io/katalog-b2b/`

---

## 🔒 Dostęp do Panelu Właściciela
* Katalog Klienta: `https://TWOJA_NAZWA.github.io/katalog-b2b/index.html`
* Panel Właściciela: `https://TWOJA_NAZWA.github.io/katalog-b2b/admin.html` (PIN: `1234`)
