import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Papa from 'papaparse';
import Chart from 'chart.js/auto';
import './styles.css';

const FALLBACK_ROWS = [
  {Order_ID:'AR-47380416-61', Product:'Meta Quest 3', Category:'Devices', Region:'United States', Customer:'Liam Smith', Sales:499, Quantity:1, Profit:82, Date:'2025-04-02'},
  {Order_ID:'AR-30631995-17', Product:'iPhone 15 Pro Max', Category:'Devices', Region:'United Kingdom', Customer:'Lily Thompson', Sales:1399, Quantity:1, Profit:246, Date:'2025-04-06'},
  {Order_ID:'AR-79609316-32', Product:'MacBook Air M3', Category:'Computers', Region:'Sweden', Customer:'Lucas Young', Sales:1299, Quantity:1, Profit:231, Date:'2025-04-10'},
  {Order_ID:'AR-17288760-13', Product:'AirPods Pro', Category:'Audio', Region:'Spain', Customer:'Isabella Garcia', Sales:229, Quantity:2, Profit:73, Date:'2025-04-14'},
  {Order_ID:'AR-24593385-96', Product:'Apple Vision Pro', Category:'Devices', Region:'United States', Customer:'Amelia Davis', Sales:3499, Quantity:1, Profit:690, Date:'2025-04-18'},
  {Order_ID:'AR-57722590-75', Product:'Oura Ring 4', Category:'Wearables', Region:'Turkey', Customer:'Caleb Turner', Sales:399, Quantity:3, Profit:121, Date:'2025-04-22'}
];

const COLORS = ['#46c7ff','#ffbe3d','#ff4fa3','#25c79a','#7b61ff','#ff6b5e','#5ee1ff'];

function fmtMoney(n){ return Number.isFinite(n) ? new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n) : '0.00'; }
function titleCase(v){ return String(v).replace(/_/g,' ').replace(/\b\w/g,m=>m.toUpperCase()); }
function toNum(v){ const x=Number(String(v).replace(/[^0-9.-]/g,'')); return Number.isFinite(x) ? x : NaN; }
function isDateLike(v){ return typeof v === 'string' && !Number.isNaN(Date.parse(v)) && /\d{2,4}[-/]|[A-Za-z]{3,}/.test(v); }
function infer(rows){
  if(!rows.length) return {num:[],cat:[],date:[]};
  const cols = Object.keys(rows[0]);
  const num=[],cat=[],date=[];
  cols.forEach(c=>{
    const vals=rows.map(r=>r[c]).filter(v=>v!=='' && v!=null).slice(0,120);
    const numeric=vals.length>0 && vals.filter(v=>Number.isFinite(toNum(v))).length/vals.length>0.8;
    const dates=vals.length>0 && vals.filter(isDateLike).length/vals.length>0.8;
    if(dates) date.push(c); else if(numeric) num.push(c); else cat.push(c);
  });
  return {num,cat,date};
}
function pick(cols, patterns, fallback=''){
  return cols.find(c=>patterns.some(p=>p.test(c))) || fallback;
}

function ChartCanvas({type,data,options,className=''}){
  const ref=useRef(null);
  React.useEffect(()=>{
    if(!ref.current) return;
    const chart=new Chart(ref.current,{type,data,options});
    return ()=>chart.destroy();
  },[JSON.stringify(data),JSON.stringify(options),type]);
  return <canvas ref={ref} className={className}/>;
}

function App(){
  const [rows,setRows]=useState(FALLBACK_ROWS);
  const [fileName,setFileName]=useState('Demo Sales Dataset');
  const [active,setActive]=useState('Overview');
  const [query,setQuery]=useState('');
  const fileRef=useRef(null);
  const info=useMemo(()=>infer(rows),[rows]);
  const cols=useMemo(()=>Object.keys(rows[0]||{}),[rows]);
  const salesCol=pick(cols,[/sales/i,/revenue/i,/amount/i,/price/i],info.num[0]);
  const profitCol=pick(cols,[/profit/i,/margin/i],info.num[1]||info.num[0]);
  const qtyCol=pick(cols,[/qty/i,/quantity/i,/units/i],info.num[2]||info.num[0]);
  const dateCol=info.date[0] || pick(cols,[/date/i,/time/i],info.date[0]);
  const catCol=pick(cols,[/category/i,/segment/i,/product/i,/type/i],info.cat[0]);
  const regionCol=pick(cols,[/region/i,/country/i,/location/i,/market/i],info.cat[1]||info.cat[0]);
  const sales=rows.reduce((s,r)=>s+(toNum(r[salesCol])||0),0);
  const profit=rows.reduce((s,r)=>s+(toNum(r[profitCol])||0),0);
  const qty=rows.reduce((s,r)=>s+(toNum(r[qtyCol])||0),0);
  const avgOrder=rows.length?sales/rows.length:0;
  const categories=useMemo(()=>{
    const m=new Map(); rows.forEach(r=>{const k=String(r[catCol]??'Unknown');m.set(k,(m.get(k)||0)+(toNum(r[salesCol])||0));});
    return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6);
  },[rows,catCol,salesCol]);
  const regions=useMemo(()=>{
    const m=new Map(); rows.forEach(r=>{const k=String(r[regionCol]??'Unknown');m.set(k,(m.get(k)||0)+1);});
    return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6);
  },[rows,regionCol]);
  const dateTrend=useMemo(()=>{
    const m=new Map();
    rows.forEach(r=>{const d=r[dateCol]; if(!d) return; const dt=new Date(d); if(Number.isNaN(dt.getTime())) return; const k=dt.toLocaleDateString('en-US',{month:'short',year:'2-digit'});m.set(k,(m.get(k)||0)+(toNum(r[salesCol])||0));});
    return [...m.entries()].slice(-8);
  },[rows,dateCol,salesCol]);
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase(); if(!q) return rows.slice(-8).reverse();
    return rows.filter(r=>Object.values(r).some(v=>String(v).toLowerCase().includes(q))).slice(0,10);
  },[rows,query]);
  const chartBase={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:'#7b8498'}},y:{grid:{color:'rgba(255,255,255,.06)'},ticks:{color:'#7b8498'}}}};
  const onFile=e=>{const file=e.target.files?.[0]; if(!file)return; Papa.parse(file,{header:true,skipEmptyLines:true,dynamicTyping:false,complete:(r)=>{if(!r.data.length){alert('No rows found in CSV.');return;} setRows(r.data);setFileName(file.name);}})};
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-orb">DP</div><div><div className="brand-title">DataPilot</div><div className="brand-sub">ANALYTICS WORKSPACE</div></div></div>
      <div className="workspace">Workspace <span>⌄</span></div>
      <nav>
        {['Overview','Dataset','Analytics','Data Quality','Exports'].map(item=><button key={item} className={active===item?'nav active':'nav'} onClick={()=>setActive(item)}><span className="nav-icon">{item==='Overview'?'◉':item==='Dataset'?'▦':item==='Analytics'?'◌':item==='Data Quality'?'✓':'⇩'}</span>{item}</button>)}
      </nav>
      <div className="side-spacer"/>
      <div className="upload-mini" onClick={()=>fileRef.current?.click()}><div className="upload-mini-icon">＋</div><div><b>Load CSV</b><span>Analyze a new dataset</span></div></div>
      <div className="profile"><div className="avatar">SM</div><div><b>Shivansh Mittal</b><span>Data Analyst Mode</span></div><span>⋯</span></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="crumb">Home <span>•</span> Analytics <span>•</span> <b>{active}</b></div><h1>{active}</h1></div><div className="top-actions"><label className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search dataset…"/></label><button className="btn ghost" onClick={()=>fileRef.current?.click()}>Upload CSV</button></div></header>
      <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFile}/>
      {active==='Overview' ? <>
        <section className="dataset-strip"><div><div className="eyebrow">ACTIVE DATASET</div><b>{fileName}</b><span>{rows.length.toLocaleString()} rows · {cols.length} columns · {info.num.length} numeric · {info.cat.length} categorical</span></div><div className="strip-actions"><button className="chip active">Live Analysis</button><button className="chip">Auto Detect</button></div></section>
        <section className="kpi-grid">
          <KPI label="Total Revenue" value={fmtMoney(sales)} suffix="USD" delta="+12.4%" tone="cyan" spark={[8,12,10,15,11,16,14,19,17,22]}/>
          <KPI label="Total Profit" value={fmtMoney(profit)} suffix="USD" delta={profit>=0?'+8.2%':'-3.4%'} tone="green" spark={[10,9,12,10,14,13,16,15,19,18]}/>
          <KPI label="Units Sold" value={qty.toLocaleString()} suffix="ITEMS" delta="+6.7%" tone="blue" spark={[12,14,13,17,15,16,19,18,20,23]}/>
          <KPI label="Average Order" value={fmtMoney(avgOrder)} suffix="USD" delta="+4.1%" tone="purple" spark={[15,13,15,14,17,16,18,20,18,21]}/>
        </section>
        <section className="grid-row top-row">
          <Card title="Sales Activity" action={<div className="periods"><span className="sel">1M</span><span>3M</span><span>6M</span><span>YTD</span><span>Total</span></div>}><div className="chart-area"><ChartCanvas type="bar" data={{labels:dateTrend.map(d=>d[0]),datasets:[{label:'Sales',data:dateTrend.map(d=>d[1]),borderRadius:6,backgroundColor:(ctx)=>ctx.dataIndex===dateTrend.length-1?'#4cc8ff':'#202941'}]}} options={chartBase}/></div></Card>
          <Card title="Revenue Mix" action={<span className="mini-status">{categories.length} segments</span>}><div className="donut-wrap"><div className="donut-chart"><ChartCanvas type="doughnut" data={{labels:categories.map(d=>d[0]),datasets:[{data:categories.map(d=>d[1]),backgroundColor:COLORS,borderWidth:0,hoverOffset:4}]}} options={{responsive:true,maintainAspectRatio:false,cutout:'72%',plugins:{legend:{display:false},tooltip:{callbacks:{label:(ctx)=>` ${fmtMoney(ctx.raw)}`}}}}}/><div className="donut-center"><b>{fmtMoney(sales)}</b><span>Total Sales</span></div></div><div className="legend-list">{categories.map((d,i)=><div className="legend-item" key={d[0]}><span className="dot" style={{background:COLORS[i%COLORS.length]}}/><span>{d[0]}</span><b>{fmtMoney(d[1])}</b></div>)}</div></div></Card>
        </section>
        <section className="grid-row bottom-row">
          <Card title="Category Performance" action={<span className="mini-status">Top {categories.length}</span>}><div className="chart-area small"><ChartCanvas type="bar" data={{labels:categories.map(d=>d[0]),datasets:[{data:categories.map(d=>d[1]),borderRadius:7,backgroundColor:COLORS}]}} options={{...chartBase,indexAxis:'y',scales:{x:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#7b8498'}},y:{grid:{display:false},ticks:{color:'#aab2c5'}}}}}/></div></Card>
          <Card title="Active Customers by Region" action={<button className="view-all">View all ↗</button>}><div className="region-list">{regions.map((d,i)=>{const pct=Math.max(18,Math.round((d[1]/Math.max(1,regions[0]?.[1]||1))*100));return <div className="region" key={d[0]}><div><span>{d[0]}</span><b>{d[1].toLocaleString()} ({pct}%)</b></div><div className="progress"><span style={{width:pct+'%',background:COLORS[i%COLORS.length]}}/></div></div>})}</div></Card>
        </section>
        <section className="table-card"><div className="table-head"><div><h3>Recent Transactions</h3><span>{rows.length} records analyzed</span></div><div className="table-tools"><button className="tool" onClick={()=>setQuery('')}>Clear</button><button className="tool" onClick={()=>alert('Export is ready to add to your existing PDF/Excel module. For now, use the CSV source file.')}>Export ↗</button></div></div><div className="table-wrap"><table><thead><tr>{cols.slice(0,7).map(c=><th key={c}>{titleCase(c)}</th>)}</tr></thead><tbody>{filtered.map((r,idx)=><tr key={idx}>{cols.slice(0,7).map(c=><td key={c}>{String(r[c]??'')}</td>)}</tr>)}</tbody></table></div></section>
      </> : <section className="empty-panel"><div className="empty-icon">{active==='Dataset'?'▦':active==='Analytics'?'◌':active==='Data Quality'?'✓':'⇩'}</div><h2>{active}</h2><p>This section is wired into the dashboard shell. Upload a CSV from the top-right to populate the live analysis.</p><button className="btn primary" onClick={()=>fileRef.current?.click()}>Upload CSV</button></section>}
    </main>
  </div>
}
function KPI({label,value,suffix,delta,tone,spark}){return <div className="kpi card"><div className="kpi-top"><span>{label}</span><span className="expand">↗</span></div><div className="kpi-value"><b>{value}</b><em>{suffix}</em></div><div className="kpi-bottom"><span className={'delta '+(delta.startsWith('-')?'down':'')}><span>↑</span>{delta}</span><Spark points={spark} tone={tone}/></div></div>}
function Spark({points}){const w=96,h=34;const max=Math.max(...points),min=Math.min(...points);const d=points.map((p,i)=>{const x=i*(w/(points.length-1));const y=h-(p-min)/(max-min||1)*(h-5)-2;return `${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`}).join(' ');return <svg className="spark" viewBox={`0 0 ${w} ${h}`}><path d={d} fill="none" stroke="#22d39f" strokeWidth="2.4" strokeLinecap="round"/></svg>}
function Card({title,action,children}){return <div className="card panel"><div className="panel-head"><h3>{title}</h3>{action}</div>{children}</div>}

createRoot(document.getElementById('root')).render(<App/>);
