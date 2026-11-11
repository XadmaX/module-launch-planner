// Send a daily aggregate increment independently of the planner's saved data.
(() => {
  if(location.origin!=='https://last-z-module-launch.framedrabbit4.chatgpt.site')return;
  const endpoint='/api/daily-open';
  const key='module-launch.visits.last-day.v1';
  const format=new Intl.DateTimeFormat('sv-SE',{
    timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'
  });

  async function count(day, correctClock=true){
    let first=false;
    try {
      if(localStorage.getItem(key)!==day){
        localStorage.setItem(key,day);
        first=true;
      }
    } catch { /* Storage is unavailable: count only the opening. */ }
    const undo=()=>{
      try{if(first && localStorage.getItem(key)===day)localStorage.removeItem(key);}catch{}
    };
    let result;
    try {
      result=await fetch(endpoint,{method:'POST',body:day+','+(first?'1':'0'),
        credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',keepalive:true,
        signal:AbortSignal.timeout(8000)});
    } catch {undo();return;}
    if(result.ok)return;
    undo();
    if(correctClock && result.status===409){
      const serverDay=await result.text();
      if(/^\d{4}-\d{2}-\d{2}$/.test(serverDay))await count(serverDay,false);
    }
  }

  function start(){
    const update=()=>count(format.format(new Date()));
    // Serialize reservations across simultaneous tabs when the browser supports locks.
    if(navigator.locks) navigator.locks.request(key,update).catch(()=>{});
    else update().catch(()=>{});
  }
  if(document.prerendering)document.addEventListener('prerenderingchange',start,{once:true});
  else start();
})();
