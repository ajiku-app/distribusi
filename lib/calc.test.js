const test=require('node:test'),assert=require('node:assert/strict'),C=require('../lib/calc.js');
const day=(d,s,i,o,extra)=>Object.assign({d,s,i,o,p:5,e:10,x:2,sh:[['A','X',10,'Y'],['B','Z',5,'Y']]},extra);
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<=t,a+' != '+b);

test('rumus dasar',()=>{const x=day('2026-10-06',500000,34604,29830);
assert.equal(C.sisa(x),500000+34604-29830);assert.equal(C.units(x),15);assert.equal(C.arm(x),17)});
test('addD melewati pergantian bulan dan tahun',()=>{assert.equal(C.addD('2026-10-31',1),'2026-11-01');assert.equal(C.addD('2026-12-31',1),'2027-01-01');assert.equal(C.addD('2026-03-01',-1),'2026-02-28')});
test('wk menghasilkan hari Senin',()=>{assert.equal(C.wk('2026-10-07'),'2026-10-05');assert.equal(C.wk('2026-10-05'),'2026-10-05');assert.equal(C.wk('2026-10-11'),'2026-10-05');assert.equal(C.wk('2026-10-12'),'2026-10-12')});
test('dayNo dan fromNo saling balik',()=>{assert.equal(C.fromNo(C.dayNo('2026-02-28')+1),'2026-03-01');assert.equal(C.dayNo('2026-10-07')-C.dayNo('2026-10-01'),6)});
test('median dan std',()=>{assert.equal(C.median([3,1,2]),2);assert.equal(C.median([4,1,3,2]),2.5);near(C.std([2,4,4,4,5,5,7,9]),2.138089935,1e-6)});

test('forecast: deret linier sempurna diprediksi tepat',()=>{const p=[];for(let i=0;i<10;i++)p.push({d:C.addD('2026-10-01',i),v:100+10*i});
const f=C.forecast(p,3);assert.equal(f.method,'tren linier');near(f.pts[0].v,200);near(f.pts[2].v,220);near(f.slope,10);near(f.pts[0].half,0,1e-6)});
test('forecast: hari kosong memakai selisih kalender',()=>{const p=[{d:'2026-10-01',v:100},{d:'2026-10-02',v:110},{d:'2026-10-03',v:120},{d:'2026-10-05',v:140},{d:'2026-10-06',v:150},{d:'2026-10-07',v:160},{d:'2026-10-08',v:170}];
const f=C.forecast(p,1);near(f.pts[0].v,180);assert.equal(f.pts[0].d,'2026-10-09')});
test('forecast: data <7 hari memakai rata-rata datar, keyakinan rendah',()=>{const p=[100,120,110,130,90].map((v,i)=>({d:C.addD('2026-10-01',i),v}));
const f=C.forecast(p,2);assert.equal(f.method,'rata-rata');assert.equal(f.conf,'rendah');near(f.pts[0].v,110);near(f.pts[1].v,110);assert.ok(f.pts[0].hi>f.pts[0].v&&f.pts[0].lo<f.pts[0].v)});
test('forecast: <3 data mengembalikan null; batas minimum dihormati',()=>{assert.equal(C.forecast([{d:'2026-10-01',v:1}],3),null);
const p=[];for(let i=0;i<8;i++)p.push({d:C.addD('2026-10-01',i),v:100-12*i});const f=C.forecast(p,3,{min:0});assert.ok(f.pts.every(q=>q.v>=0&&q.lo>=0))});
test('forecast: keyakinan tinggi butuh >=14 hari dan R2>=0.5',()=>{const p=[];for(let i=0;i<14;i++)p.push({d:C.addD('2026-10-01',i),v:100+5*i+(i%2?1:-1)});assert.equal(C.forecast(p,1).conf,'tinggi')});

test('projectStock: mendeteksi hari melewati kapasitas',()=>{const ds=[];for(let i=0;i<10;i++)ds.push(day(C.addD('2026-10-01',i),390000+i*1000,30000,20000,{}));
const last=ds[9],cap=C.sisa(last)+25000,ps=C.projectStock(ds,7,cap);assert.ok(ps.net>0);assert.ok(ps.full);assert.ok(ps.full.k>=2&&ps.full.k<=3);assert.equal(ps.empty,null)});
test('projectStock: mendeteksi stok habis jika outbound terus lebih besar',()=>{const ds=[];for(let i=0;i<10;i++)ds.push(day(C.addD('2026-10-01',i),50000,10000,30000));
const ps=C.projectStock(ds,7,400000);assert.ok(ps.net<0);assert.ok(ps.daysToEmpty>0);assert.ok(ps.empty)});

test('anomalies: lonjakan terdeteksi, variasi normal tidak',()=>{const base=[100,102,98,101,99,103,100,97].map((v,i)=>({d:C.addD('2026-10-01',i),v}));
assert.equal(C.anomalies(base).length,0);
const a=C.anomalies(base.concat([{d:'2026-10-09',v:180}]));assert.equal(a.length,1);assert.equal(a[0].dir,'up');assert.ok(a[0].pct>50)});
test('anomalies: penurunan ke nol terdeteksi; <5 pembanding diabaikan',()=>{const base=[100,102,98,101,99,103].map((v,i)=>({d:C.addD('2026-10-01',i),v}));
const a=C.anomalies(base.concat([{d:'2026-10-07',v:0}]));assert.equal(a.length,1);assert.equal(a[0].dir,'down');
assert.equal(C.anomalies([{d:'2026-10-01',v:100},{d:'2026-10-02',v:100},{d:'2026-10-03',v:500}]).length,0)});

test('laborBudget: biaya = cost per unit median x outbound prediksi',()=>{const ds=[],lc={};for(let i=0;i<8;i++){const d=C.addD('2026-10-01',i);ds.push(day(d,400000,30000,40000));lc[d]=16000000}
const fo=C.forecast(ds.map(x=>({d:x.d,v:x.o})),3,{min:0}),b=C.laborBudget(ds,lc,fo);near(b.cpu,400);near(b.pts[0].v,40000*400,1);assert.equal(b.n,8)});
test('laborBudget: butuh minimal 3 hari cost labour',()=>{const ds=[day('2026-10-01',1,1,10),day('2026-10-02',1,1,10),day('2026-10-03',1,1,10),day('2026-10-04',1,1,10)];
const fo=C.forecast(ds.map(x=>({d:x.d,v:x.o})),2);assert.equal(C.laborBudget(ds,{'2026-10-01':1000},fo),null)});

test('forecast: lonjakan tunggal tidak merusak tren (dikeluarkan dari perhitungan)',()=>{const p=[];for(let i=0;i<10;i++)p.push({d:C.addD('2026-10-01',i),v:i===9?1000:100+10*i});
const f=C.forecast(p,1);assert.equal(f.excluded,1);near(f.pts[0].v,200,1e-6);assert.equal(C.forecast(p,1,{robust:false}).excluded,0)});
test('forecast: pergeseran level berkelanjutan tidak dibuang sebagai anomali',()=>{const p=[];for(let i=0;i<10;i++)p.push({d:C.addD('2026-10-01',i),v:i<5?100:200});
assert.equal(C.forecast(p,1).excluded,0)});

test('cost per kendaraan dihitung dari Common Carrier saja, bukan total semua carrier',()=>{const x=day('2026-10-07',1,1,1000,{p:5,e:17,x:3});const lc={'2026-10-07':9467493};
assert.equal(C.veh(x),17);assert.equal(C.arm(x),25);const r=C.laborRows([x],lc)[0];assert.equal(r.veh,17);near(r.cpv,9467493/17,1e-6)});
