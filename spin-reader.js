// Offline image recognition for the English Module Spin layout. Only engine assets are fetched.
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
  function tokenAnchor(frame) {
    const w=103, h=Math.min(330, Math.round(frame.canvas.height*0.15));
    const {data} = frame.getImageData(635,0,w,h);
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
          return {x:635+minX, y:Math.round((firstRow+lastRow)/2)-72};
        firstRow=-1; minX=w; maxX=-1;
      }
    }
    return null;
  }

  async function recognize(worker, frame) {
    const extra=frame.canvas.height-1600, plus=tokenAnchor(frame);
    async function line(box, offset, threshold, chars='') {
      const [l,t,r,b]=box;
      if (t+offset<0 || b+offset>frame.canvas.height) return '';
      await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:chars});
      const {data}=await worker.recognize(lineImage(frame,[l,t+offset,r,b+offset],threshold));
      return data.text.trim().replace(/\s+/g,'').toLowerCase();
    }
    async function locate(box, candidates, expected) {
      for(const offset of new Set(candidates.map(Math.round))) {
        if(expected.test(await line(box,offset,185))) return offset;
      }
      return null;
    }
    async function field(box, offset, thresholds, chars, pattern) {
      const a=await line(box,offset,thresholds[0],chars);
      if(!pattern.test(a)) return null;
      const b=await line(box,offset,thresholds[1],chars);
      return a===b ? a.match(pattern) : null;
    }
    const header=await locate([74,43,327,102],[plus?.y||0,0,extra/2],/^[ma]odulespin$/);
    if(header===null) return {};
    const middle=await locate([393,667,500,713],[extra/2,header,extra,0],/^luck$/);
    if(middle===null) return {};
    const result={};
    if(plus) {
      const tokens=await field([plus.x-64,53,plus.x-6,92],header,[190,200],'0123456789',/^\d{1,4}$/);
      if(tokens) result.tokens=Number(tokens[0]);
    }
    const luck=await field([388,706,518,775],middle,[170,190],'0123456789',/^\d{1,3}$/);
    if(luck && Number(luck[0])<=200) result.luck=Number(luck[0]);
    for(const offset of new Set([middle,Math.round(extra),header])) {
      const draws=await field([111,1159,322,1207],offset,[170,198],'',/^draws:(\d{1,5})$/);
      if(draws) {result.draws=Number(draws[1]); break;}
    }
    if(result.luck>result.draws) {delete result.luck; delete result.draws;}
    const time=await field([69,106,253,148],header,[170,191],'0123456789d:',/^(?:([0-6])d)?(\d{1,2}):([0-5]\d):([0-5]\d)$/);
    if(time && Number(time[2])<24) result.time=[time[1]||'0',time[2].padStart(2,'0'),time[3],time[4]].join(':');
    return result;
  }

  return async function readSpinScreen(image) {
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
      worker=await engine.createWorker('eng',1,{
        workerPath:new URL('worker.min.js',assets).href, workerBlobURL:false,
        corePath:new URL('tesseract-core-lstm.wasm.js',assets).href, langPath:assets.href,
        errorHandler:rejectLoad
      });
      if(finished) {await worker.terminate();return {};}
      return recognize(worker,frame);
    }
    try {return await Promise.race([run(),failure]);}
    finally {
      finished=true; clearTimeout(timer);
      if(worker) await worker.terminate();
      frame.canvas.width=0;
    }
  };
})();
