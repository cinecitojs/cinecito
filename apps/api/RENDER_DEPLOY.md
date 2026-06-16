# Render deployment notes

Build command:

```
npm ci
npm run prisma:generate
npm run build
```

Start command:

```
npm start
```

Ensure environment variables in Render: DATABASE_URL, JWT_SECRET, REDIS_URL, R2_* and FRONTEND_URL
