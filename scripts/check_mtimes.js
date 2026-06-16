const fs = require('fs');
function show(p){ try{ const s=fs.statSync(p); console.log(p, 'mtime:', s.mtime.toISOString()); } catch(e){ console.log(p, 'missing'); }}
show('apps/api/src/modules/rooms/routes.ts');
show('apps/api/dist/modules/rooms/routes.js');
