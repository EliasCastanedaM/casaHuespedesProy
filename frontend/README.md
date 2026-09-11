# React + Vite

## Configuración de API

El navegador usa `VITE_API_URL` para habitaciones, disponibilidad, reservas y
administración. El asesor virtual usa la función de servidor `/api/ai-chat`
para que `AI_INTERNAL_TOKEN` nunca forme parte del código enviado al navegador.

Configura estas variables en Vercel antes de publicar:

- `VITE_API_URL`: URL del backend terminada en `/api`.
- `BACKEND_API_URL`: la misma URL del backend; puede incluir o no `/api`.
- `AI_INTERNAL_TOKEN`: el mismo valor configurado en el backend. Debe guardarse
  como secreto y nunca usar el prefijo `VITE_`.

Para probar el asesor localmente utiliza `vercel dev`, porque Vite por sí solo
no ejecuta funciones de servidor. El resto del frontend continúa funcionando
con `npm run dev`.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
