const plannerOrigin = 'https://last-z-module-launch.framedrabbit4.chatgpt.site';
const madridDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone:'Europe/Madrid', year:'numeric', month:'2-digit', day:'2-digit'
});

function response(body, status, headers={}) {
  return new Response(body, {status, headers:{
    'Cache-Control':'private, no-store', 'Referrer-Policy':'no-referrer',
    'X-Content-Type-Options':'nosniff', ...headers
  }});
}

async function record(request, db) {
  if (request.method !== 'POST') return response(null,405,{Allow:'POST'});
  if (request.headers.get('Origin') !== plannerOrigin) return response(null,403);
  const cors={'Access-Control-Allow-Origin':plannerOrigin, Vary:'Origin'};
  if (request.headers.get('Content-Type')?.split(';')[0] !== 'text/plain' ||
      Number(request.headers.get('Content-Length')) > 12) return response(null,400,cors);
  // The only permitted payload is a calendar day, a comma and a first-open bit.
  const reader=request.body?.getReader();
  if (!reader) return response(null,400,cors);
  const bytes=new Uint8Array(12);
  let used=0;
  while(true){
    const {done,value}=await reader.read();
    if(done)break;
    if(used+value.length>bytes.length){await reader.cancel();return response(null,400,cors);}
    bytes.set(value,used);used+=value.length;
  }
  const event=/^(\d{4}-\d{2}-\d{2}),([01])$/.exec(new TextDecoder().decode(bytes.subarray(0,used)));
  if(!event)return response(null,400,cors);
  const today=madridDate.format(new Date());
  if(event[1]!==today)return response(today,409,cors);
  await db.prepare(`INSERT INTO daily_counts (day, opens, browsers) VALUES (?,1,?)
    ON CONFLICT(day) DO UPDATE SET opens=opens+1, browsers=browsers+excluded.browsers`)
    .bind(today,Number(event[2])).run();
  return response(null,204,cors);
}

async function report(request,env) {
  if(request.method!=='GET')return response(null,405,{Allow:'GET'});
  // The Sites dispatcher supplies verified identity after the owner signs in.
  const userId=request.headers.get('oai-authenticated-user-id');
  const email=request.headers.get('oai-authenticated-user-email');
  if(!userId || !email)return response(null,302,{Location:'/signin-with-chatgpt?return_to=%2Fstats'});
  if(!env.REPORT_OWNER_EMAIL || email.trim().toLowerCase()!==env.REPORT_OWNER_EMAIL)
    return response('Доступ только владельцу',403,{'Content-Type':'text/plain; charset=utf-8'});
  const today=madridDate.format(new Date());
  const {results}=await env.DB.prepare('SELECT day, opens, browsers FROM daily_counts ORDER BY day DESC LIMIT 30').all();
  const current=results.find(row=>row.day===today) || {opens:0,browsers:0};
  const rows=results.filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(row.day));
  const body=`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Посещения · Module Launch</title><link rel="stylesheet" href="/style.css">
  <style>*{box-sizing:border-box}body{margin:0;background:#f5f7f2;color:#1c3b32;font:16px/1.5 system-ui,sans-serif}main{max-width:710px;margin:auto;padding:36px 18px}h1{font-size:clamp(24px,5vw,38px);margin:0}.today{display:flex;gap:12px;margin:20px 0}.metric{flex:1;background:white;border:1px solid #d3e0d6;border-radius:16px;padding:14px}.metric strong{display:block;font-size:30px}table{width:100%;border-collapse:collapse}th,td{text-align:right;padding:8px 4px;border-bottom:1px solid #d3e0d6}th:first-child,td:first-child{text-align:left}p{color:#41594f}</style>
  <main><h1>Посещения планера</h1><p>Сегодня, ${today} · Europe/Madrid</p>
  <div class="today"><div class="metric">Открытия<strong>${Number(current.opens)}</strong></div><div class="metric">Браузеры<strong>${Number(current.browsers)}</strong></div></div>
  <table><caption>Последние 30 дней с посещениями</caption><thead><tr><th>Дата</th><th>Открытия</th><th>Браузеры</th></tr></thead><tbody>
  ${rows.map(row=>`<tr><td>${row.day}</td><td>${Number(row.opens)}</td><td>${Number(row.browsers)}</td></tr>`).join('')}
  </tbody></table><p>Перезагрузка страницы считается открытием. Для подсчёта браузеров на устройстве сохраняется только день последнего учёта. Блокировка хранилища, очистка данных и разные устройства влияют на оценку.</p></main></html>`;
  return response(body,200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'"});
}

export default {async fetch(request,env){
  const url=new URL(request.url);
  if(url.search)return response(null,400);
  if(url.pathname==='/open')return record(request,env.DB);
  if(url.pathname==='/style.css' && env.ASSETS)return env.ASSETS.fetch(request);
  if(url.pathname==='/stats'||url.pathname==='/')return report(request,env);
  return response(null,404);
}};
