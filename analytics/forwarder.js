const plannerOrigin='https://last-z-module-launch.framedrabbit4.chatgpt.site';
const receiver='https://module-launch-visits.framedrabbit4.chatgpt.site/open';

function reply(status,body=null){
  return new Response(body,{status,headers:{'Cache-Control':'no-store','Content-Type':'text/plain'}});
}
async function forward(request,env) {
  if(request.method!=='POST')return reply(405);
  if(request.headers.get('Origin')!==plannerOrigin)return reply(403);
  if(request.headers.get('Content-Type')?.split(';')[0]!=='text/plain' ||
     Number(request.headers.get('Content-Length'))>12)return reply(400);
  if(!env.DAILY_INCREMENT_TOKEN)return reply(503);
  const reader=request.body?.getReader();
  if(!reader)return reply(400);
  const bytes=new Uint8Array(12);let used=0;
  while(true) {
    const {done,value}=await reader.read();if(done)break;
    if(used+value.length>12){await reader.cancel();return reply(400);}
    bytes.set(value,used);used+=value.length;
  }
  const body=new TextDecoder().decode(bytes.subarray(0,used));
  if(!/^\d{4}-\d\d-\d\d,[01]$/.test(body))return reply(400);
  try {
    // Fixed write-only destination. Forward only the validated date and bit.
    const upstream=await fetch(receiver,{method:'POST',redirect:'manual',body,headers:{
      'Content-Type':'text/plain','Origin':plannerOrigin,
      'OAI-Sites-Authorization':'Bearer '+env.DAILY_INCREMENT_TOKEN
    }});
    if(upstream.status===204)return reply(204);
    if(upstream.status===409){
      const day=await upstream.text();
      if(/^\d{4}-\d\d-\d\d$/.test(day))return reply(409,day);
    }
  }catch{}
  return reply(503);
}
export default {async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/api/daily-open')return url.search?reply(400):forward(request,env);
  if(env.ASSETS && ['GET','HEAD'].includes(request.method))return env.ASSETS.fetch(request);
  return reply(404);
}};
