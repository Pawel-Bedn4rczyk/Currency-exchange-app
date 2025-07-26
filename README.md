Fullstack Developer - Tasks
==========

------------

### :warning: Zapoznaj się z poniższymi wytycznymi do pracy.
### :warning: Treść zadań do wykonania przesłaliśmy mailem.

------------

Jak zacząć pracę
------------
1. Należy zrobić Fork z tego repozytorium [Jak forkować repozytorium w GitHub](https://docs.github.com/en/get-started/quickstart/fork-a-repo), w ten sposób tworząc sobie prywatne miejsce do pracy.
1. Następnie w stworzonym przez siebie forku repozytorium stwórz branch od gałęzi master, na którym będziesz pracować, np: ` $ git checkout -b MojeZadanieJanKowalski `

### Setup środowiska (zalecany - bez Docker)

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

**Hot reload:**
- Zmiany w plikach PHP/Twig → odśwież stronę
- Zmiany w plikach JS/CSS/React → automatyczne przeładowanie

### Setup środowiska za pomocą vHost (alternatywny)

  1. Skonfiguruj sobie lokalny serwer (np. Apache) pod development; ustaw vHosta tak, żeby pod wybraną domeną pokazywał na odpowiedni katalog na dysku (tj. katalog `public/` z repo) - przykład poniżej:

        ```
        <VirtualHost *:80>
            # Root - katalog /public z repozytorium z Github
            DocumentRoot "C:/xampp/htdocs/recruitment_task_fullstack/public/"
            # domena lokalna
            ServerName telemedi-zadanie.localhost
        </VirtualHost>
        ```
  1. Jeśli Twoja skonfigurowana domena jest inna niż `telemedi-zadanie.localhost` - zmień ją w pliku `assets/js/components/SetupCheck.js` w metodzie getBaseUrl()
  1. Zainstaluj paczki composera i npm (`$ composer install && npm install`)
  1. Zbuduj appkę frontową w trybie watch (`$ npm run watch --dev`)
  1. …i już, do dzieła! :)

### Setup środowiska za pomocą dockera

  1. Uruchom komendę:
  
        ```
        docker compose up -d
        ```
  1. Pod adresem  `http://telemedi-zadanie.localhost` powinna uruchomić się aplikacja 

------------
_FYI: tak wygląda działająca aplikacja, gotowa do developmentu:_

![Working_app_image](https://github.com/telemedico/recruitment_task_fullstack/blob/master/assets/img/working_app_preview.png?raw=true)

------------

Wytyczne dot. implementacji
------------

**Głównym celem implementacji powinno być pokazanie się z dobrej strony jako programista, czyli nie ma jednego słusznego podejścia! :)**

  1. W ramach implementacji nie należy dodawać nowych paczek do composer’a/npm’a. Zachęcamy do korzystania z tych, które już są dodane.
  1. Development należy prowadzić pod kątem kompatybilności PHP z wersją 8.2 (zgodnie z composer.json)
  1. Napisanie testów jest elementem oceny.
  1. **Ocenie podlegać będzie całość podejścia do zadania.**

Niedokończone zadanie też warto podesłać, np. z komentarzem, co by można było dodać - rozumiemy, że czasem nie starcza czasu na wszystko co się chce zrobić!

Zakończenie pracy i wysłanie wyniku
------------
  1. **W swoim forku utwórz Pull Request do brancha master. Nie rób PR do oryginalnego repozytorium** (Pull Requesty do publicznych repo są publiczne)
  1. **Poza implementacją zależy nam też na informacjach zwrotnych, które posłużą nam w poprawie jakości zadań.** Dlatego prosimy Cię o umieszczenie dodatkowo informacji w opisie tworzonego Pull Requesta:
     1. Faktycznie poświęconego czasu na zadanie (po zakończeniu implementacji)
     1. Feedbacku do samego zadania 
     1. Twoich komentarzy dot. podejścia do zadania itd 
        1. np. _“Robiąc X miałem na względzie Y, zastosowałem podejście Z”_ 
  1. **Prosimy, potwierdź nam mailowo wykonanie zadania, wysyłając link do Pull Requesta w swoim forku. Upewnij się, że Twój PR będzie dla nas dostępny - przynajmniej dla usera `mkleska-telemedi`!**