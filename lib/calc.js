(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.Calc=factory()})(typeof self!=='undefined'?self:this,function(){
'use strict';
const pad=n=>String(n).padStart(2,'0');
const sisa=x=>x.s+x.i-x.o,units=x=>x.sh.reduce((a,r)=>a+r[2],0),arm=x=>x.p+x.e+x.x;
const addD=(d,n)=>{const t=new Date(d+'T00:00:00');t.setDate(t.getDate()+n);return t.getFullYear()+'-'+pad(t.getMonth()+1)+'-'+pad(t.getDate())};
const wk=d=>addD(d,-((new Date(d+'T00:00:00').getDay()+6)%7));
const dayNo=d=>Math.round(Date.UTC(+d.slice(0,4),+d.slice(5,7)-1,+d.slice(8,10))/864e5);
const fromNo=n=>{const t=new Date(n*864e5);return t.getUTCFullYear()+'-'+pad(t.getUTCMonth()+1)+'-'+pad(t.getUTCDate())};
const mean=a=>a.reduce((s,v)=>s+v,0)/(a.length||1);
const median=a=>{const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length?(s.length%2?s[m]:(s[m-1]+s[m])/2):0};
const std=a=>{if(a.length<2)return 0;const m=mean(a);return Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/(a.length-1))};
const Z80=1.2816;
function zOf(base,v){const med=median(base),mad=median(base.map(x=>Math.abs(x-med)));let z;
if(mad>0)z=.6745*(v-med)/mad;else{const md=mean(base.map(x=>Math.abs(x-med)));if(!md)return null;z=(v-med)/(1.253314*md)}
return{z,med}}
function outlierFlags(vals,zmin,rel){return vals.map((v,i)=>{const base=vals.filter((_,j)=>j!==i);if(base.length<5)return false;const r=zOf(base,v);
return !!r&&Math.abs(r.z)>=zmin&&Math.abs(v-r.med)>=Math.abs(r.med)*rel})}

function linfit(xs,ys){const n=xs.length,mx=mean(xs),my=mean(ys);let sxx=0,sxy=0,syy=0;
for(let i=0;i<n;i++){sxx+=(xs[i]-mx)**2;sxy+=(xs[i]-mx)*(ys[i]-my);syy+=(ys[i]-my)**2}
const b=sxx?sxy/sxx:0,a=my-b*mx;let sse=0;for(let i=0;i<n;i++)sse+=(ys[i]-(a+b*xs[i]))**2;
return{a,b,mx,sxx,n,r2:syy?1-sse/syy:0,se:n>2?Math.sqrt(sse/(n-2)):0}}

/* Prediksi deret harian. points=[{d,v}] berurutan. Memakai selisih hari kalender (hari kosong tidak menggeser tren).
   n<7: rata-rata datar (tren belum bisa dipercaya). n>=7: regresi linier pada maksimal `win` hari terakhir. Rentang 80%. */
function forecast(points,horizon,opts){opts=opts||{};const win=opts.win||14,all=points.slice(-win);
if(all.length<3)return null;
let pts=all,excluded=0;
if(opts.robust!==false&&all.length>=7){const fl=outlierFlags(all.map(p=>p.v),3.5,.2),k=fl.filter(Boolean).length;
if(k>0&&k<=Math.floor(all.length*.2)&&all.length-k>=3){pts=all.filter((_,i)=>!fl[i]);excluded=k}}
const d0=dayNo(pts[0].d),lastD=all[all.length-1].d,xs=pts.map(p=>dayNo(p.d)-d0),ys=pts.map(p=>p.v),n=pts.length,lastX=dayNo(lastD)-d0;
const flat=n<7,f=flat?{a:mean(ys),b:0,mx:mean(xs),sxx:0,se:std(ys),r2:0}:linfit(xs,ys),out=[];
for(let k=1;k<=horizon;k++){const x=lastX+k;let v=f.a+f.b*x;
const half=Z80*f.se*Math.sqrt(1+1/n+(flat||!f.sxx?0:(x-f.mx)**2/f.sxx));
let lo=v-half,hi=v+half;if(opts.min!=null){v=Math.max(opts.min,v);lo=Math.max(opts.min,lo);hi=Math.max(opts.min,hi)}
out.push({d:addD(lastD,k),v,lo,hi,half})}
return{pts:out,n,excluded,slope:f.b,r2:f.r2,se:f.se,method:flat?'rata-rata':'tren linier',conf:n<7?'rendah':(n>=14&&f.r2>=.5?'tinggi':'sedang')}}

/* Proyeksi sisa stok = sisa terakhir + akumulasi (inbound prediksi - outbound prediksi). */
function projectStock(days,horizon,cap){const ds=days.slice().sort((a,b)=>a.d<b.d?-1:1);if(ds.length<3)return null;
const fi=forecast(ds.map(x=>({d:x.d,v:x.i})),horizon,{min:0}),fo=forecast(ds.map(x=>({d:x.d,v:x.o})),horizon,{min:0});
if(!fi||!fo)return null;
let cur=sisa(ds[ds.length-1]),acc=0;const pts=[];let full=null,empty=null;
for(let k=0;k<horizon;k++){const net=fi.pts[k].v-fo.pts[k].v;cur+=net;acc+=fi.pts[k].half**2+fo.pts[k].half**2;const h=Math.sqrt(acc);
const p={d:fi.pts[k].d,v:cur,lo:cur-h,hi:cur+h,net};pts.push(p);
if(full==null&&cur>cap)full={d:p.d,k:k+1};if(empty==null&&cur<0)empty={d:p.d,k:k+1}}
const last=sisa(ds[ds.length-1]),net=mean(pts.map(p=>p.net));
return{pts,fi,fo,last,net,cap,full,empty,
daysToFull:net>0&&last<cap?(cap-last)/net:null,daysToCap:net<0&&last>cap?(last-cap)/-net:null,daysToEmpty:net<0&&last>0?last/-net:null,
n:ds.length,excluded:fi.excluded+fo.excluded,conf:fi.conf==='rendah'||fo.conf==='rendah'?'rendah':(fi.conf==='tinggi'&&fo.conf==='tinggi'?'tinggi':'sedang'),method:fi.method}}

/* Deteksi anomali: modified z-score (median & MAD) terhadap hari-hari lain pada jendela. Butuh >=5 data pembanding. */
function anomalies(points,opts){opts=opts||{};const win=opts.win||14,check=opts.check||3,zmin=opts.z||3.5,rel=opts.rel||.2,pts=points.slice(-win),res=[];
for(let i=Math.max(0,pts.length-check);i<pts.length;i++){const base=pts.filter((_,j)=>j!==i).map(p=>p.v);if(base.length<5)continue;
const v=pts[i].v,r=zOf(base,v);if(!r)continue;const z=r.z,med=r.med;
const pct=med?(v-med)/Math.abs(med)*100:0;
if(Math.abs(z)>=zmin&&Math.abs(v-med)>=Math.abs(med)*rel)res.push({d:pts[i].d,v,med,z,pct,dir:v>med?'up':'down'})}
return res}

const lcOf=(lc,d)=>+lc[d]||0;
function laborRows(days,lc){return days.filter(x=>lcOf(lc,x.d)>0).sort((a,b)=>a.d<b.d?-1:1).map(x=>({d:x.d,cost:lcOf(lc,x.d),o:x.o,veh:arm(x),cpu:x.o>0?lcOf(lc,x.d)/x.o:null,cpv:arm(x)>0?lcOf(lc,x.d)/arm(x):null}))}
/* Kebutuhan biaya tenaga kerja = cost per unit median x outbound prediksi. Butuh >=3 hari cost labour. */
function laborBudget(days,lc,fo){const rows=laborRows(days,lc).slice(-14).filter(r=>r.cpu!=null);if(rows.length<3||!fo)return null;
const cpu=median(rows.map(r=>r.cpu)),pts=fo.pts.map(p=>({d:p.d,v:p.v*cpu,lo:p.lo*cpu,hi:p.hi*cpu}));
return{cpu,n:rows.length,pts,avgActual:mean(rows.map(r=>r.cost)),avgVol:mean(fo.pts.map(p=>p.v)),total:pts.reduce((s,p)=>s+p.v,0)}}

return{sisa,units,arm,addD,wk,dayNo,fromNo,mean,median,std,linfit,forecast,projectStock,anomalies,laborRows,laborBudget}});
