// Offline image recognition for the localized Module Spin layout. Only engine assets are fetched.
window.readSpinScreen = (() => {
  const assets = new URL('ocr/', document.baseURI);
  let library;
  function loadEngine() {
    if (!library) library = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('tesseract.min.js', assets);
      script.onload = () => resolve(window.Tesseract);
      script.onerror = () => { library = null; script.remove(); reject(Error('engine')); };
      document.head.append(script);
    });
    return library;
  }

  function canvas(width, height) {
    const element = document.createElement('canvas');
    element.width = width;
    element.height = height;
    return element.getContext('2d', {willReadFrequently:true});
  }

  // Convert bright game lettering to black on white, adding a margin for single-line OCR.
  function lineImage(frame, [left, top, right, bottom], threshold) {
    const width = (right-left)*3, height = (bottom-top)*3;
    const ctx = canvas(width+24, height+24);
    ctx.fillStyle = 'white';
    ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(frame.canvas,left,top,right-left,bottom-top,12,12,width,height);
    const image = ctx.getImageData(12,12,width,height);
    for (let i=0; i<image.data.length; i+=4) {
      const gray = 0.299*image.data[i] + 0.587*image.data[i+1] + 0.114*image.data[i+2];
      image.data[i] = image.data[i+1] = image.data[i+2] = gray>threshold ? 0 : 255;
    }
    ctx.putImageData(image,12,12);
    return ctx.canvas;
  }

  // The green plus moves horizontally with the width of the balance.
  function tokenAnchor(frame, mirrored=false) {
    const w=103, h=Math.min(330, Math.round(frame.canvas.height*0.15));
    const origin=mirrored?900-635-w:635;
    const {data} = frame.getImageData(origin,0,w,h);
    let firstRow=-1, lastRow=-1, minX=w, maxX=-1;
    for (let y=0; y<=h; y++) {
      let left=w, right=-1;
      for (let x=0; y<h && x<w; x++) {
        const i=4*(y*w+x), g=data[i+1];
        if (g>130 && g>1.5*data[i] && g>1.5*data[i+2]) {
          left=Math.min(x,left); right=x;
        }
      }
      if (right>=left) {
        if (firstRow<0) firstRow=y;
        lastRow=y; minX=Math.min(minX,left); maxX=Math.max(maxX,right);
      } else if (firstRow>=0) {
        if (maxX-minX>=18 && maxX-minX<=30 && lastRow-firstRow>=16 && lastRow-firstRow<=31)
          return {x:origin+(mirrored?maxX:minX), y:Math.round((firstRow+lastRow)/2)-72, mirrored};
        firstRow=-1; minX=w; maxX=-1;
      }
    }
    return null;
  }

  const models = {
    en:'eng', ru:'rus', uk:'ukr', de:'deu', tr:'tur', es:'spa', ar:'ara',
    'zh-Hans':'chi_sim', 'zh-Hant':'chi_tra', ja:'jpn', ko:'kor', fr:'fra',
    ca:'cat', 'pt-BR':'por', it:'ita', pl:'pol', id:'ind', vi:'vie', th:'tha',
    nl:'nld', ms:'msa', hi:'hin', ur:'urd'
  };
  const digits = '0123456789٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹०१२३४५६७८९๐๑๒๓๔๕๖๗๘๙';
  function normalize(text) {
    return text.normalize('NFKC').replace(/[\u200e\u200f\u061c]/g,'')
      .replace(/[٠-٩۰-۹०-९๐-๙]/g,c=>String(digits.indexOf(c)%10)).trim();
  }
  function numberInLine(text) {
    const groups=text.match(/\d+/g);
    return groups?.length===1 && groups[0].length<=5 ? Number(groups[0]) : null;
  }
  function countdown(text) {
    // The day unit can be a word, abbreviation or ideograph, or a fourth colon group.
    text=text.replace(/^[Зз](?=[дД])/,'3');
    const m=/^(?:(\d)\s*(?:[\p{L}\p{M}.]+|:)\s*)?(\d{1,2})\s*:\s*(\d{2})\s*:\s*(\d{2})$/u.exec(text);
    if(!m || Number(m[1]||0)>6 || +m[2]>23 || +m[3]>59 || +m[4]>59) return null;
    return [m[1]||'0',m[2].padStart(2,'0'),m[3],m[4]].join(':');
  }

  // Identify the open wheel by its colored sectors, independent of title or label translations.
  function wheelOffset(frame, extra, header) {
    const patches=frame.getImageData(0,0,frame.canvas.width,frame.canvas.height);
    const checks=[
      [337,572,'blue'],[290,737,'blue'],[593,760,'blue'],[522,577,'blue'],
      [270,672,'purple'],[586,666,'purple'],[510,830,'gold'],[412,585,'gold']
    ];
    function hasColor(x,y,type) {
      const i=4*(y*patches.width+x);
      const [r,g,b]=patches.data.subarray(i,i+3);
      if(type==='blue') return b>140 && g>r+45 && b>r+60;
      if(type==='purple') return b>145 && r>g+25 && b>g+55;
      return r>150 && g>85 && g>b+45 && r>b+80;
    }
    for(const offset of new Set([Math.round(extra/2),header,extra,0])) {
      for(const mirror of [false,true]) {
        if(checks.filter(([x,y,type])=>hasColor(mirror?899-x:x,y+offset,type)).length>=7) return offset;
      }
    }
    return null;
  }

  // Match isolated numeric glyphs against fonts available on the device. This also handles
  // digit scripts that a language's text OCR model transliterates or drops on short lines.
  function ink(ctx,box,threshold) {
    const [l,t,r,b]=box, w=r-l, h=b-t;
    const {data}=ctx.getImageData(l,t,w,h);
    const bits=new Uint8Array(w*h);
    for(let i=0;i<bits.length;i++){
      bits[i]=(data[4*i]*.299+data[4*i+1]*.587+data[4*i+2]*.114)>threshold;
    }
    return {bits,w,h};
  }
  function glyphRuns({bits,w,h}) {
    const runs=[]; let left=-1,top=h,bottom=-1;
    for(let x=0;x<=w;x++) {
      let found=false;
      for(let y=0;x<w && y<h;y++) if(bits[y*w+x]) {
        found=true; top=Math.min(top,y); bottom=Math.max(bottom,y);
      }
      if(found && left<0) left=x;
      if(!found && left>=0) {runs.push({left,right:x,top,bottom:bottom+1});left=-1;top=h;bottom=-1;}
    }
    return runs;
  }
  function shape(pixels,r) {
    const w=r.right-r.left,h=r.bottom-r.top;
    const grid=new Uint8Array(16*24);
    for(let y=0;y<24;y++) for(let x=0;x<16;x++) {
      const iy=r.top+Math.floor((y+.5)*h/24), ix=r.left+Math.floor((x+.5)*w/16);
      grid[y*16+x]=pixels.bits[iy*pixels.w+ix];
    }
    return {grid,aspect:w/h};
  }
  const alphabets={ar:'٠١٢٣٤٥٦٧٨٩',ur:'۰۱۲۳۴۵۶۷۸۹',hi:'०१२३४५६७८९',th:'๐๑๒๓๔๕๖๗๘๙'};
  const hindiDays=Array.from(alphabets.hi,d=>d+'दिन');
  const templates=new Map();
  function digitTemplates(alphabet) {
    if(templates.has(alphabet)) return templates.get(alphabet);
    const list=[],ctx=canvas(140,80);
    for(const weight of ['normal','bold']) for(const family of ['Arial','sans-serif','system-ui']) {
      ctx.font=weight+' 38px '+family;ctx.textBaseline='alphabetic';
      for(const [value,char] of Array.from(alphabet).entries()) {
        ctx.fillStyle='black';ctx.fillRect(0,0,140,80);
        ctx.fillStyle='white';ctx.fillText(char,5,55);
        const p=ink(ctx,[0,0,140,80],150), runs=glyphRuns(p);
        if(!runs.length)continue;
        const all={left:runs[0].left,right:runs.at(-1).right,top:Math.min(...runs.map(r=>r.top)),bottom:Math.max(...runs.map(r=>r.bottom))};
        list.push({...shape(p,all),value});
      }
    }
    templates.set(alphabet,list);return list;
  }
  function classify(pixels,run,alphabet) {
    const glyph=shape(pixels,run), scores=Array(10).fill(1);
    for(const template of digitTemplates(alphabet)) {
      const ratio=Math.abs(Math.log(template.aspect/glyph.aspect));
      if(ratio>.65)continue;
      let mismatch=0;
      for(let i=0;i<glyph.grid.length;i++) mismatch+=glyph.grid[i]!==template.grid[i];
      const score=mismatch/glyph.grid.length+ratio*.12;
      scores[template.value]=Math.min(score,scores[template.value]);
    }
    const min=Math.min(...scores),best=scores.indexOf(min);
    return min<.19 && scores.every((v,i)=>i===best || v>min+.018)?String(best):null;
  }
  const pairTemplates=new Map();
  function joinedPair(pixels,run,alphabet) {
    if(!Object.values(alphabets).includes(alphabet)) return null;
    if(!pairTemplates.has(alphabet)) {
      const refs=[],ctx=canvas(140,80);
      for(const weight of ['bold','normal']) {
        ctx.font=weight+' 38px Arial, sans-serif';
        for(let i=0;i<100;i++){
          const value=String(i).padStart(2,'0');
          ctx.fillStyle='black';ctx.fillRect(0,0,140,80);ctx.fillStyle='white';
          ctx.fillText([...value].map(n=>alphabet[+n]).join(''),5,55);
          const p=ink(ctx,[0,0,140,80],150),rs=glyphRuns(p);
          if(!rs.length)continue;
          const box={left:rs[0].left,right:rs.at(-1).right,top:Math.min(...rs.map(r=>r.top)),bottom:Math.max(...rs.map(r=>r.bottom))};
          refs.push({...shape(p,box),value});
        }
      }
      pairTemplates.set(alphabet,refs);
    }
    const glyph=shape(pixels,run);
    let best=.17, answer=null,second=1;
    for(const t of pairTemplates.get(alphabet)) {
      const ratio=Math.abs(Math.log(t.aspect/glyph.aspect));
      if(ratio>.35)continue;
      let mismatch=0;
      for(let i=0;i<glyph.grid.length;i++) mismatch+=glyph.grid[i]!==t.grid[i];
      const score=mismatch/glyph.grid.length+ratio*.18;
      if(score<best){if(answer!==t.value)second=best;best=score;answer=t.value;}
      else if(t.value!==answer)second=Math.min(score,second);
    }
    return answer && second-best>.012?answer:null;
  }
  function isColon(pixels,r) {
    const width=r.right-r.left,height=r.bottom-r.top;
    if(width<2||width>9||height<8||height>30||width/height>.55)return false;
    let bands=0,on=false;
    for(let y=r.top;y<r.bottom;y++){
      let row=false;
      for(let x=r.left;x<r.right;x++) if(pixels.bits[y*pixels.w+x])row=true;
      if(row&&!on)bands++;
      on=row;
    }
    return bands===2;
  }

  function nativeDraws(frame,box,alphabet) {
    const p=ink(frame,box,179),runs=glyphRuns(p);
    const marks=runs.map((r,i)=>isColon(p,r)?i:-1).filter(i=>i>=0);
    if(marks.length===1) {
      const idx=marks[0];
      const values=[runs.slice(0,idx),runs.slice(idx+1)].map(rs=>visualNumber(p,rs,alphabet)).filter(v=>v!==null);
      if(values.length===1)return Number(values[0]);
    }
    // RTL labels can render after the number with the colon joined to a label glyph.
    if(alphabet===alphabets.ar || alphabet===alphabets.ur) {
      const firstText=runs.findIndex(r=>classify(p,r,alphabet)===null);
      if(firstText>0 && runs[firstText].left-runs[firstText-1].right>=3) {
        const leading=visualNumber(p,runs.slice(0,firstText),alphabet);
        if(leading!==null)return Number(leading);
      }
    }
    return null;
  }

  function visualNumber(pixels,runs,alphabet) {
    if(!runs.length || runs.length>5)return null;
    const chars=runs.map(r=>classify(pixels,r,alphabet)??joinedPair(pixels,r,alphabet));
    return chars.includes(null)?null:chars.join('');
  }

  function visualTimer(frame,box,lang) {
    const pixels=ink(frame,box,178);
    const runs=glyphRuns(pixels);
    const marks=runs.map((r,i)=>isColon(pixels,r)?i:-1).filter(i=>i>=0);
    if(marks.length!==2)return null;
    const [a,b]=marks;
    if(a<1||b<=a+1||b>a+3||b+1>=runs.length)return null;
    for(const alphabet of [alphabets[lang],'0123456789'].filter(Boolean)) {
      const read=rr=>visualNumber(pixels,rr,alphabet);
      const m=read(runs.slice(a+1,b));
      if(m?.length!==2 || +m>59)continue;
      for(const hs of [2,1]) for(const ss of [2,1]) {
        if(hs>a || b+ss>=runs.length)continue;
        const h=read(runs.slice(a-hs,a)),s=read(runs.slice(b+1,b+1+ss));
        if(!h||h.length>2||+h>23||s?.length!==2||+s>59)continue;
        const before=runs.slice(0,a-hs),after=runs.slice(b+1+ss);
        let day='0';
        if(before.length||after.length) {
          const candidates=[];
          if(before.length){
            candidates.push(read(before.slice(0,1)));
            if(lang==='hi' && before.length===1) candidates.push(classify(pixels,before[0],hindiDays));
          }
          if(after.length)candidates.push(read(after.slice(-1)));
          const ds=[...new Set(candidates.filter(v=>v!==null && /^[0-6]$/.test(v)))];
          if(ds.length!==1)continue;
          day=ds[0];
        }
        return [day,h.padStart(2,'0'),m,s].join(':');
      }
    }
    return null;
  }

  async function recognize(worker, frame, lang) {
    const extra=frame.canvas.height-1600, plus=tokenAnchor(frame) || (['ar','ur'].includes(lang)?tokenAnchor(frame,true):null);
    const header=plus?.y||0;
    const middle=wheelOffset(frame,extra,header);
    if(middle===null) return {};
    async function confirmed(box,offset,thresholds,chars,parse) {
      const [l,t,r,b]=box;
      if(t+offset<0 || b+offset>frame.canvas.height) return null;
      await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:chars});
      let prior;
      for(const threshold of thresholds) {
        const {data}=await worker.recognize(lineImage(frame,[l,t+offset,r,b+offset],threshold));
        const value=parse(normalize(data.text));
        if(value===null || (prior!==undefined && value!==prior)) return null;
        prior=value;
      }
      return prior;
    }
    async function counter(box,offset,thresholds) {
      const pixels=ink(frame,[box[0],box[1]+offset,box[2],box[3]+offset],thresholds[0]);
      const runs=glyphRuns(pixels).filter(r=>r.bottom-r.top>=3);
      for(const alphabet of [alphabets[lang],'0123456789'].filter(Boolean)) {
        const number=visualNumber(pixels,runs,alphabet);
        if(number!==null)return Number(number);
      }
      return confirmed(box,offset,thresholds,digits,numberInLine);
    }
    const result={};
    if(plus) {
      const box=plus.mirrored?[plus.x+6,53,plus.x+65,92]:[plus.x-64,53,plus.x-6,92];
      const tokens=await counter(box,header,[190,200]);
      if(tokens!==null) result.tokens=tokens;
    }
    const luck=await counter([403,709,499,766],middle,[170,190]);
    if(luck!==null && luck<=200) result.luck=luck;
    const rtl=lang==='ar'||lang==='ur';
    const drawBoxes=[[105,1159,730,1206]];
    if(rtl) drawBoxes.push([170,1159,810,1206]);
    for(const offset of new Set([middle,extra,header])) {
      for(const box of drawBoxes) {
        const native=alphabets[lang] && nativeDraws(frame,[box[0],box[1]+offset,box[2],box[3]+offset],alphabets[lang]);
        const draws=native??await confirmed(box,offset,[170,198],'',numberInLine);
        if(draws!==null) {result.draws=draws; break;}
      }
      if(result.draws!==undefined) break;
    }
    if(result.luck>result.draws) {delete result.luck; delete result.draws;}
    for(const box of (rtl?[[82,108,398,146],[450,106,825,148]]:[[82,108,398,146]])) {
      let time=visualTimer(frame,[box[0],box[1]+header,box[2],box[3]+header],lang);
      if(time===null) time=await confirmed(box,header,[170,191],'',countdown);
      if(time===null && box[0]<100) time=await confirmed([69,106,253,148],header,[170,191],'0123456789d:',text=>text.includes('d')?countdown(text):null);
      if(time!==null) {result.time=time; break;}
    }
    return result;
  }
  return async function readSpinScreen(image, lang='en') {
    const h=Math.round(900*image.naturalHeight/image.naturalWidth);
    if(h<1150 || h>2600) return {};
    const frame=canvas(900,h);
    frame.imageSmoothingQuality='high';
    frame.drawImage(image,0,0,900,h);
    let worker, timer, finished=false, rejectLoad;
    const failure=new Promise((_,reject)=>{rejectLoad=reject;timer=setTimeout(()=>reject(Error('timeout')),90000);});
    async function run() {
      const engine=await loadEngine();
      if(finished) return {};
      const model=models[lang] || 'eng';
      worker=await engine.createWorker(model==='eng'?'eng':['eng',model],1,{
        workerPath:new URL('worker.min.js',assets).href, workerBlobURL:false,
        corePath:new URL('tesseract-core-lstm.wasm.js',assets).href, langPath:assets.href,
        errorHandler:rejectLoad
      });
      if(finished) {await worker.terminate();return {};}
      return recognize(worker,frame,lang);
    }
    try {return await Promise.race([run(),failure]);}
    finally {
      finished=true; clearTimeout(timer);
      if(worker) await worker.terminate();
      frame.canvas.width=0;
    }
  };
})();
