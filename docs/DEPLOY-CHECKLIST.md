# Deploy Checklist

Guía rápida para hacer deploys a producción sin sorpresas. No es un procedimiento burocrático — es una lista de chequeos concretos aprendidos de deploys reales.

**Regla de oro**: nunca trabajar directo en `master`. Toda feature va primero a `develop`, se prueba en `innova-develop.netlify.app`, y solo después se mergea a `master`.

---

## Antes del deploy

### Chequeos locales

- [ ] Estoy en la branch correcta: `git branch` muestra `develop` (o la feature branch que estoy por mergear a develop).
- [ ] No hay cambios sin commitear: `git status` dice "nothing to commit, working tree clean".
- [ ] Branch está sincronizada con origin: `git pull` no trae nada nuevo.
- [ ] El proyecto compila localmente: `npm run build` sin errores.

### Chequeos de entorno

- [ ] Si el cambio agrega una **variable de entorno nueva**, está seteada en producción (Netlify → sitio producción → Environment variables).
- [ ] Si el cambio depende de **datos en el store** (Blobs), verificar que los datos existen o cargar seed antes del deploy.
- [ ] Si el cambio es de UI grande, tomar screenshot del estado actual como baseline por si hay que comparar después.

---

## El deploy

### Merge a master

```bash
git checkout master
git pull origin master
git merge develop --no-edit
git push origin master
```

El `--no-edit` evita que se abra vim para editar el mensaje del merge.

### Esperar deploy verde

- [ ] Ir a Netlify → sitio producción → Deploys.
- [ ] El nuevo deploy aparece con badge "Building".
- [ ] Esperar 2-3 minutos hasta que quede "Published" (verde).
- [ ] Si sale "Failed" (rojo), leer el log y corregir antes de seguir.

---

## Después del deploy

### Sanity check

- [ ] Home de producción carga: `https://innovatrabajosocial.com.ar`.
- [ ] Ruta del cambio principal funciona (por ejemplo, si el cambio afecta el checkout, abrir el modal y verificar).
- [ ] Consola del navegador sin errores JS.

### Verificación funcional

- [ ] Probar el flow completo end-to-end de lo que se cambió.
- [ ] Si el cambio afecta el admin, loggear y verificar.
- [ ] Si el cambio afecta el flow de pago, hacer una compra de prueba (solo hasta el paso donde no cobra, o usar un email de prueba).

### Sincronizar develop

Si el fix se hizo en `master` directo (excepción, no debería pasar):

```bash
git checkout develop
git pull origin develop
git merge master --no-edit
git push origin develop
```

Esto evita divergencias entre branches que se acumulan y complican merges futuros.

---

## Rollback

Si algo se rompe en producción y no se puede corregir en el momento:

### Opción A — Redeploy anterior desde Netlify

- Ir a Netlify → Deploys → buscar el deploy anterior estable (badge "Published" pre-cambio).
- Click en el deploy → **Publish deploy**.
- Netlify vuelve a publicar ese deploy. Sitio queda en el estado anterior.
- Trabajar el fix en develop con calma después.

### Opción B — Revert commit

```bash
git checkout master
git revert HEAD --no-edit
git push origin master
```

Genera un commit nuevo que deshace el anterior. Netlify redeploya automáticamente. **Preferible sobre Opción A si el bug es claramente del último commit** — deja historia limpia en git.

### Opción C — Reset (solo si nadie más pusheó)

```bash
git checkout master
git reset --hard HEAD~1
git push origin master --force
```

**Riesgoso**: reescribe historia. Solo usar si estás seguro de que sos el único que pushea a master y nadie tomó el commit malo.

---

## Reglas de convivencia

- **Nunca trabajar directo en master**. Toda feature: develop → probar → merge.
- **Después de push a master, sincronizar develop** para evitar divergencias.
- **Backups antes de deploys grandes** (schema changes, migraciones). Curl a `products-list` o `admin-payments-list` a un archivo local.
- **Avisar a Innova** antes de deploys que cambian business rules (bloqueo de métodos de pago, cambio de precios, etc). Es cortesía, no requerimiento.

---

## Troubleshooting de bugs recurrentes

### `_redirects` vs `netlify.toml`

Si un redirect definido en `netlify.toml` no se aplica: probablemente `public/_redirects` tiene un catch-all que gana precedencia. **`_redirects` gana sobre `netlify.toml`**. Solución: agregar el redirect también en `_redirects` (antes del catch-all `/*`), o borrar `_redirects` si es redundante.

Ejemplo válido de `public/_redirects`:


El `!` fuerza el redirect (equivalente a `force = true` del toml).

### Duplicación de exports en build

Si el build falla con "Multiple exports with the same name X": alguien pegó dos veces la misma función en el mismo archivo. Buscar la función duplicada con `grep -n "export const NOMBRE" path/al/archivo.js` — debería devolver 1 sola línea, no 2. Borrar la duplicada.

### Fragmento JSX que copia mal el tag `<a`

Cuando se copia código JSX multilínea con un tag `<a>` que abre en una línea y tiene los atributos en las siguientes, a veces el `<a` se pierde al pegar. Si al copiar código del chat aparece un warning tipo "unexpected token" cerca de un `href={...}`, verificar que la línea anterior diga `<a` — probablemente falte.

### Bug del `featured` que aparece destildado

Al editar un producto en el ABM, el checkbox "Cápsula destacada" puede aparecer destildado aunque el valor guardado sea `true`. Antes de guardar cambios, verificar el estado real del checkbox. Si se destilda por error y se guarda, el producto pierde el `featured` sin aviso.

### 502 en admin-payments-list u otras functions

Si un endpoint devuelve 502 después de un deploy, revisar el log del deploy en Netlify. Los errores de bundling de functions (por ejemplo, un archivo con syntax error) hacen que la función quede sin bundle y devuelva 502. Fix: corregir el error de syntax y redeployar.

---

## Contactos y accesos

- **Netlify**: [app.netlify.com](https://app.netlify.com) — team Dynova.
- **Producción**: sitio `innovatrabajosocial`, branch `master`, URL `innovatrabajosocial.com.ar`.
- **Develop**: sitio `innova-develop`, branch `develop`, URL `innova-develop.netlify.app`.
- **GitHub**: `dynovaagency/innova-web`.
- **Superadmins**: `felixdoura@gmail.com`, `hola@dynovaagency.com`.