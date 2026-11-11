// Match game artwork to locate the counters independently of translated headings.
// Each signature contains 8 × 6 RGB samples of an icon, in row order.
(() => {
const art = {"chest":{"w":205,"h":120,"rgb":[236,176,60,243,167,13,197,98,13,189,98,12,224,160,57,228,173,74,226,158,54,241,197,77,245,196,81,247,217,126,226,129,21,172,82,21,192,120,33,202,143,57,205,132,34,208,130,33,247,185,83,246,204,90,243,173,24,209,134,34,179,108,19,208,148,65,156,80,15,154,66,10,249,212,91,249,227,102,255,248,189,240,203,113,234,151,23,244,160,3,179,93,14,163,66,6,249,210,90,255,227,63,242,166,44,249,249,188,239,215,156,249,223,118,177,48,2,142,28,2,251,168,15,249,244,48,247,241,97,179,101,21,255,254,185,246,243,172,157,45,11,119,24,0]},"ingot":{"w":53,"h":32,"rgb":[84,30,6,79,26,5,75,25,4,76,25,2,66,43,16,56,35,13,36,9,1,37,9,1,91,33,8,190,161,49,227,211,143,155,115,31,179,141,57,207,179,91,35,9,0,34,8,1,95,33,9,245,217,122,244,231,145,203,173,85,174,120,29,75,38,2,204,138,36,251,249,193,214,189,113,242,222,175,98,23,0,105,29,4,227,166,21,208,150,34,231,214,154,231,198,101,244,211,98,247,217,114,131,55,6,250,226,125,245,227,133,250,229,148,210,166,66,33,9,1,130,61,27,116,53,21,108,47,18,78,31,10,205,142,48,239,199,92,38,12,2,38,14,3]},"passCoin":{"w":140,"h":124,"rgb":[96,81,63,67,49,34,254,94,38,208,181,137,243,225,120,255,230,130,218,167,78,239,102,54,96,82,64,255,103,0,249,179,42,255,223,109,255,252,144,255,253,230,229,162,32,165,78,3,235,198,134,231,144,23,255,194,41,255,234,79,255,255,146,255,159,39,185,77,1,255,245,144,240,205,161,238,162,18,254,204,57,255,176,55,255,255,133,175,78,10,255,232,119,255,239,139,221,131,6,229,169,42,251,207,79,255,244,180,237,135,16,255,244,128,255,236,127,255,225,113,226,170,49,232,190,77,198,113,7,222,149,6,235,155,47,255,251,146,255,255,163,255,238,120]},"giftCoin":{"w":112,"h":110,"rgb":[165,173,188,185,173,161,195,74,33,218,179,90,255,222,128,188,106,48,254,113,74,171,172,188,195,146,60,212,134,46,211,138,29,109,42,6,255,239,136,219,148,32,236,187,91,229,72,36,145,107,73,202,128,27,222,171,73,227,146,16,145,74,32,250,213,122,254,225,135,214,58,27,208,132,34,211,164,72,219,162,6,214,153,68,254,236,144,252,228,140,238,209,119,226,59,21,189,88,35,223,176,80,255,212,89,248,206,106,255,240,151,252,236,163,255,255,186,229,185,103,195,194,192,215,103,42,127,86,30,145,82,29,249,102,41,226,177,82,219,165,80,134,138,143]},"packCoin":{"w":161,"h":75,"rgb":[220,175,85,213,145,38,227,179,76,202,129,40,253,227,135,216,66,32,78,176,113,82,173,111,193,120,24,215,160,64,125,58,2,241,201,104,250,216,127,211,59,26,179,123,78,195,71,54,207,156,61,182,110,35,116,38,7,253,236,150,249,226,140,186,71,44,209,79,64,142,24,18,245,202,130,238,201,136,253,208,115,254,244,163,216,128,76,219,181,116,205,52,31,90,50,28,203,87,40,221,171,83,242,208,115,181,26,8,205,164,85,108,30,14,238,137,103,215,48,31,80,175,116,184,36,13,194,41,16,223,168,86,189,132,62,101,36,10,243,72,46,126,21,13]},"rewardCoin":{"w":55,"h":58,"rgb":[153,108,40,155,109,41,155,109,41,142,94,34,142,94,34,197,109,65,247,112,73,95,59,14,156,111,45,157,112,45,173,80,28,196,124,69,225,186,93,245,232,186,242,219,134,255,254,185,162,118,52,205,175,88,204,134,80,219,149,36,227,172,62,229,194,94,167,104,55,221,150,13,168,126,60,134,71,35,209,128,24,222,164,52,209,148,64,198,156,91,246,201,108,249,212,123,147,112,54,209,159,70,201,146,50,223,172,76,255,255,178,181,122,55,255,237,147,254,237,147,176,141,74,118,34,12,212,166,75,244,201,46,195,148,42,251,206,110,255,238,150,255,255,169]}};
function locate(pixels, signature, left, top, right, bottom, tolerance=22) {
  let best=tolerance, match=null;
  const {w,h,rgb}=art[signature];
  function score(x,y) {
    let distance=0,k=0;
    for(let row=0;row<6;row++) for(let col=0;col<8;col++) {
      const i=((y+Math.floor((row+.5)*h/6))*pixels.width+x+Math.floor((col+.5)*w/8))*4;
      for(let c=0;c<3;c++) distance+=Math.abs(pixels.data[i+c]-rgb[k++]);
    }
    return distance/rgb.length;
  }
  function probe(x,y) {
    const value=score(x,y);
    if(value<best) {best=value;match={x,y};}
  }
  const stride=w<65?2:4;
  for(let y=Math.max(0,top);y<=Math.min(bottom,pixels.height-h);y+=stride)
    for(let x=Math.max(0,left);x<=Math.min(right,pixels.width-w);x+=stride) probe(x,y);
  if(match) {
    const {x,y}=match;
    for(let dy=-3;dy<=3;dy++) for(let dx=-3;dx<=3;dx++)
      if(x+dx>=0&&y+dy>=0&&x+dx+w<=pixels.width&&y+dy+h<=pixels.height) probe(x+dx,y+dy);
  }
  return match;
}

window.readStockFields=async function(type, frame, worker, {lineImage,normalize,digits}) {
  const h=frame.canvas.height,p=frame.getImageData(0,0,900,h);
  function fraction(x,y,w,height,test) {
    let hits=0,total=0;
    for(let j=y;j<y+height;j+=3) for(let i=x;i<x+w;i+=3) {
      const k=4*(j*900+i);
      if(test(p.data[k],p.data[k+1],p.data[k+2])) hits++;
      total++;
    }
    return hits/total;
  }
  const gray=(r,g,b)=>Math.max(r,g,b)-Math.min(r,g,b)<13 && r>103 && r<224;
  const green=(r,g,b)=>g>100 && g>r*1.19 && g>b*1.35;
  const gold=(r,g,b)=>r>155 && r>g*1.08 && g>b*1.35;
  const blue=(r,g,b)=>b>130 && b>r*1.5 && g>r*1.3;
  async function number(box,parse,whitelist=digits,thresholds=[165,190]) {
    if(box[1]<0||box[3]>h) return null;
    await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:whitelist});
    let previous;
    for(const t of thresholds) {
      const {data}=await worker.recognize(lineImage(frame,box,t));
      const value=parse(normalize(data.text));
      if(value===null || (previous!==undefined && value!==previous))return null;
      previous=value;
    }
    return previous;
  }
  const integer=s=>/^\d{1,6}$/.test(s)?Number(s):null;
  if(type==='bars') {
    if(!locate(p,'chest',405,55,530,290))return {};
    const icon=locate(p,'ingot',625,22,781,180,38);
    if(!icon)return {};
    const bars=await number([icon.x+54,icon.y-2,866,icon.y+36],s=>integer(s.replace(/[,.\s ]/g,'')),digits+'.,');
    return bars===null?{}:{bars};
  }
  if(type==='pass') {
    const coin=locate(p,'passCoin',315,115,402,345);
    if(!coin)return {};
    const dy=coin.y-187, result={};
    const purchased=fraction(619,361+dy,208,65,gray)>.60;
    if(purchased) {
      // A claimed Prime reward confirms ownership even when the button text is localized.
      // On a scrolled list the button itself can still explicitly say that it was bought.
      const confirmed=await number([579,354+dy,864,436+dy],s=>
        /bought|purchased|куплен|придбано|gekauft|satın alındı|comprad|acheté|acquistat|已购|已購|購入済|구매\s*완료/i.test(s)?1:null,'',[175,187]);
      if(confirmed===1) result.prime=true;
    } else if(fraction(619,361+dy,208,65,(r,g,b)=>gold(r,g,b)||green(r,g,b))>.52) {
      const price=await number([576,354+dy,879,436+dy],s=>/\d/.test(s)?1:null,'',[215,231]);
      if(price===1) result.prime=false;
    }

    const level=await number([330,464+dy,382,514+dy],integer,digits,[204,225]);
    if(level===null||level<1||level>7)return result;
    // Locate unlocked blue row badges. Scroll position can change independently of the header.
    let start=null;
    const rows=[];
    for(let y=557+dy;y<Math.min(h-35,1430+dy);y+=2) {
      const on=fraction(332,y,46,3,blue)>.47;
      if(on && start===null)start=y;
      if(!on && start!==null){
        if(y-start>=32 && y-start<82)rows.push(Math.round((start+y)/2));
        start=null;
      }
    }
    const states=new Map();
    for(const y of rows) {
      const row=await number([333,y-29,380,y+29],integer,digits,[187,213]);
      if(row===null||row<1||row>level)continue;
      function check(x) {
        if(fraction(x-25,y-23,54,47,green)>.085)return true;
        if(fraction(x-29,y-25,58,50,gold)>.35)return false;
        return null;
      }
      const free=check(166), primeMark=check(545);
      if(purchased && primeMark===true) result.prime=true;
      if(result.prime===undefined)continue;
      const paid=result.prime?primeMark:free;
      if(free!==null && free===paid)states.set(row,free);
    }
    if(states.get(level)===true) Object.assign(result,{pass:level,passToday:false});
    if(level>=2 && states.get(level)===false && states.get(level-1)===true)
      Object.assign(result,{pass:level-1,passToday:true});
    return result;
  }
  if(type!=='shop')return {};
  const gift=locate(p,'giftCoin',146,116,211,420);
  if(!gift)return {};
  const dy=gift.y-228, dx=gift.x-176, result={};
  if(fraction(540+dx,305+dy,177,59,gray)>.65)result.gift=false;
  else if(fraction(540+dx,305+dy,177,59,(r,g,b)=>green(r,g,b)||gold(r,g,b))>.52) result.gift=true;
  // Only infer a sold-out pack between the top gift and consecutive, identified larger packs.
  let previous=0;
  for(let slot=0;slot<4;slot++) {
    const shift=dy+slot*294;
    if(675+shift>h-70)break;
    const icon=locate(p,'rewardCoin',369+dx,480+shift,391+dx,498+shift,36);
    const bundle=locate(p,'packCoin',154+dx,534+shift,189+dx,558+shift,35);
    if(!icon&&!bundle)break;
    const size=await number([435+dx,549+shift,461+dx,572+shift],integer,digits,[197,216]);
    if(![10,15,25,50,100].includes(size)||size<=previous)break;
    for(const [amount,key] of [[10,'daily'],[15,'medium'],[25,'large']]) {
      if(previous<amount && amount<size)result[key]=amount===10?false:0;
      if(amount===size) {
        const limit=await number([156+dx,635+shift,503+dx,678+shift],s=>{
          const numbers=s.match(/\d+/g);
          return numbers?.length===1?Number(numbers[0]):null;
        },'');
        if(limit!==null && limit<=(amount===10?1:amount===15?2:3))
          result[key]=amount===10?limit>0:limit;
      }
    }
    previous=size;
    if(size>=25)break;
  }
  return result;
};
})();
