# Руководство по публикации Dota Wiki

В этом файле описано, как загрузить проект на GitHub и развернуть его на бесплатном хостинге.

---

## 1. Загрузка проекта на GitHub

Инструменты **Git** и **GitHub CLI (`gh`)** уже установлены и настроены в системе. Локальный репозиторий инициализирован, а все лишние файлы (локальная база SQLite `dev.db`, временные логи, ключи) автоматически скрыты в `.gitignore`.

### Способ А: Через GitHub CLI (Самый простой способ в 1 команду)

1. Откройте терминал и выполните авторизацию в GitHub:
   ```bash
   gh auth login
   ```
   *Выберите `GitHub.com` -> `HTTPS` -> войдите через браузер (нажав Enter и введя код).*

2. Создайте репозиторий и отправьте код одной командой:
   ```bash
   gh repo create dota-wiki --public --source=. --push
   ```
   *(Или `--private`, если хотите приватный репозиторий).*

---

### Способ Б: Через сайт GitHub вручную

1. Зайдите на [github.com/new](https://github.com/new) и создайте новый пустой репозиторий (например, `dota-wiki`). **Не ставьте галочки** на README, .gitignore или License.
2. Скопируйте ссылку на репозиторий и выполните в терминале проекта:
   ```bash
   git remote add origin https://github.com/ВАШ_ЛОГИН/dota-wiki.git
   git push -u origin main
   ```

---

## 2. Бесплатный хостинг

Для проектов на **Next.js 16 (App Router)** лучшим и стандартным бесплатным решением является **Vercel** в связке с облачной PostgreSQL базой (**Neon** или **Supabase**).

> **Почему не локальный SQLite на Vercel?**
> Vercel — это Serverless-платформа. Файловая система там эфемерна (read-only). Локальный файл `dev.db` не сохраняет изменения при перезапусках функций. Поэтому для продакшена нужна бесплатная облачная база данных.

---

### Рекомендуемый вариант: Vercel + Neon (100% Бесплатно)

#### Шаг 1. Бесплатная база данных (Neon.tech)
1. Зарегистрируйтесь на [neon.tech](https://neon.tech) (через GitHub в 1 клик).
2. Создайте проект (на бесплатном тарифе дается 0.5 GB хранилища — этого с головой хватит на сотни тысяч матчей).
3. Скопируйте строку подключения `DATABASE_URL` (формат: `postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require`).

#### Шаг 2. Переключение Prisma на PostgreSQL
В проекте для этого уже настроен удобный скрипт:
```bash
npm run db:use-pg
```
*(Либо вручную в [prisma/schema.prisma](file:///c:/Users/nazar/dota-wiki/prisma/schema.prisma) замените `provider = "sqlite"` на `provider = "postgresql"`).*

Примените схему к вашей новой базе Neon:
```bash
npx prisma db push
```

#### Шаг 3. Деплой на Vercel
1. Перейдите на [vercel.com](https://vercel.com) и войдите через свой аккаунт GitHub.
2. Нажмите **"Add New"** -> **"Project"**.
3. Выберите ваш репозиторий `dota-wiki` и нажмите **"Import"**.
4. В разделе **Environment Variables** добавьте переменные:
   - `DATABASE_URL` — ваша строка от Neon Postgres (`postgresql://...`).
   - `SESSION_SECRET` — любая длинная случайная строка (например, 32+ символа).
   - `NEXTAUTH_URL` — адрес вашего сайта (например, `https://dota-wiki.vercel.app` или оставьте пустым / обновите после деплоя).
   - `STRATZ_API_TOKEN` — ваш токен Stratz (если используется).
   - `STEAM_API_KEY` — ключ Steam API (если используется).
5. Нажмите **Deploy**!
Через 1-2 минуты проект будет запущен и доступен по бесплатному адресу с HTTPS (`https://dota-wiki-xxx.vercel.app`).

---

### Альтернативный вариант: Render.com

Если вам нужен постоянный фоновый процесс Node.js (например, для автообновления матчей через `instrumentation.ts` в фоне без Vercel Cron):
1. Зайдите на [render.com](https://render.com).
2. Создайте бесплатную **PostgreSQL** базу.
3. Создайте **New Web Service**, подключите репозиторий GitHub.
4. Настройки:
   - **Environment**: Node
   - **Build Command**: `npm run db:use-pg && npm run build`
   - **Start Command**: `npm run start`
   - **Environment Variables**: Добавьте `DATABASE_URL`, `SESSION_SECRET`, `NEXTAUTH_URL`.
5. Нажмите **Deploy**.

*(Примечание: на бесплатном тарифе Render сервис засыпает после 15 минут неактивности и просыпается при первом запросе за ~30-50 секунд).*

---

## 3. Полезные команды

- `npm run db:use-pg` — переключить Prisma схему на PostgreSQL (для облака).
- `npm run db:use-sqlite` — вернуть Prisma схему на локальный SQLite (для разработки).
- `npx prisma db push` — применить изменения схемы к текущей базе данных.
- `npx prisma studio` — визуальный интерфейс для просмотра записей в базе данных.
