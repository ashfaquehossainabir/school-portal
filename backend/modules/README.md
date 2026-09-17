# Adding a new module

This app is now multi-school-ready: every collection carries a `school`
field (see `models/School.js` and `migrations/001-add-school.js`), and
`middleware/tenant.js` has two helpers every route uses to stay scoped to
the logged-in user's school:

```js
const { scopeQuery, withSchool } = require('../middleware/tenant');

// Reads
const items = await SomeModel.find(scopeQuery(req, { className }));

// Writes
const item = await SomeModel.create(withSchool(req, req.body));
```

When adding a new feature module (library, transport, online examinations,
parent-teacher meetings, certificates, etc.), follow the existing pattern
so it plugs in the same way as attendance/exams/notices did:

1. **Model(s)** in `backend/models/` — always include:
   ```js
   school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
   ```
   as the first field, same as every existing model.
2. **Routes** in `backend/routes/<module>Routes.js` — use `protect` +
   `authorize(...)` from `middleware/auth.js`, and `scopeQuery`/`withSchool`
   from `middleware/tenant.js` on every query, exactly like
   `routes/noticeRoutes.js` or `routes/examRoutes.js`.
3. **Mount it** in `server.js` under `/api/<module>`.
4. **Frontend**: a `frontend/src/pages/<role>/<Module>.jsx` per role that
   needs it, plus shared view/manager components in
   `frontend/src/components/`, matching how Notes/Notices/Exams are split.

Nothing above requires touching existing modules — each one is additive.
