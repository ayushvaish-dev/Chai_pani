# Client Setup

Set the backend base URL in `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

If you already created `base_url=...`, that key is also supported.

All frontend API requests use this value through the shared request utility, and the Vite dev proxy also reads from the same env setting.
