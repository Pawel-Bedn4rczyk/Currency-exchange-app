### Setup środowiska (zalecany)

**Wymagania:**
- PHP 8.2+ (np. XAMPP)
- Composer
- Node.js 18+

**Kroki:**

1. **Zainstaluj dependencies:**
   ```bash
   composer install
   npm install
   ```

2. **Uruchom backend (Symfony) - Terminal 1:**
   ```bash
   # Windows (XAMPP)
   php -S localhost:8000 -t public/
   
   # Linux/Mac
   php -S localhost:8000 -t public/
   ```

3. **Uruchom frontend (dev-server z hot reload) - Terminal 2:**
   ```bash
   npm run dev-server
   ```

4. **Otwórz aplikację:**
   - Główna aplikacja: http://localhost:8000
   - Dev-server (tylko assety): http://localhost:8080
