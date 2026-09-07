import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
from datetime import datetime, date
import json, html, os

DB = os.path.join(os.path.dirname(__file__), 'crm.db')
HOST, PORT = '127.0.0.1', 8000

STAGES = ['Yangi lead','Aloqa qilindi','Mahsulot yuborildi','Narx aytildi','Qiziqdi','Buyurtma tasdiqlandi','Yetkazmaga berildi','Sotib oldi','Yo‘qotildi','Javob bermadi','Keyinroq oladi']
SOURCES = ['Instagram Target','Instagram Organic','Instagram Blogger','Telegram','Direct','Referral','Boshqa']
LOSS_REASONS = ['Qimmat','Javob bermadi','Mahsulot yoqmadi','Razmer yo‘q','Boshqa mahsulot oldi','Yetkazib berish muammosi','Fikridan qaytdi','Raqobatchidan oldi','Noma’lum']
RESULTS = ['Sotib oldi','Sotib olmadi','Kutilmoqda']

SCHEMA = '''CREATE TABLE IF NOT EXISTS deals (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 lead_date TEXT NOT NULL,
 instagram TEXT,
 name TEXT,
 phone TEXT,
 product TEXT,
 product_price REAL DEFAULT 0,
 source TEXT,
 campaign TEXT,
 stage TEXT,
 loss_reason TEXT,
 manager TEXT,
 last_contact TEXT,
 next_contact TEXT,
 result TEXT,
 sale_amount REAL DEFAULT 0,
 order_id TEXT,
 note TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);'''

def db():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c

def init_db():
    c = db(); c.execute(SCHEMA)
    if c.execute('SELECT COUNT(*) FROM deals').fetchone()[0] == 0:
        now = datetime.now().isoformat(timespec='seconds')
        samples = [
            ('2026-09-07','@malika_01','Malika','90...','Kostyum yubka',255000,'Instagram Target','Kostyum-01','Yangi lead','','Ali','','2026-09-08','Kutilmoqda',0,'',''),
            ('2026-09-07','@dilnoza_22','Dilnoza','91...','Kostyum yubka',255000,'Instagram Target','Kostyum-01','Narx aytildi','','Ali','2026-09-07','2026-09-07','Kutilmoqda',0,'',''),
            ('2026-09-07','@madina_style','Madina','93...','Kostyum yubka',255000,'Instagram Organic','','Sotib oldi','','Ali','2026-09-07','','Sotib oldi',255000,'44',''),
            ('2026-09-07','@nargiza_777','Nargiza','95...','Kostyum yubka',255000,'Instagram Target','Kostyum-01','Yo‘qotildi','Qimmat','Ali','2026-09-07','','Sotib olmadi',0,'',''),
        ]
        for s in samples:
            c.execute('''INSERT INTO deals(lead_date,instagram,name,phone,product,product_price,source,campaign,stage,loss_reason,manager,last_contact,next_contact,result,sale_amount,order_id,note,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''', s + (now, now))
    c.commit(); c.close()

def esc(x): return html.escape(str(x or ''))
def money(x):
    try: return f'{float(x):,.0f}'.replace(',', ' ')
    except: return '0'

def page(content, title='Latta Putta CRM'):
    return f'''<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)}</title>
<style>
:root{{--bg:#f1f2f4;--card:#fff;--text:#172033;--muted:#6b7280;--line:#dfe1e6;--primary:#0c66e4;--green:#1f845a;--red:#c9372c;--yellow:#b65c02;--nav:#172b4d}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);font-family:Inter,Arial,sans-serif;color:var(--text)}}
nav{{height:64px;background:var(--nav);color:#fff;display:flex;align-items:center;padding:0 24px;gap:20px;position:sticky;top:0;z-index:20}}nav .logo{{font-weight:800;font-size:19px;margin-right:10px}}nav a{{color:#d7e0ee;text-decoration:none;padding:9px 11px;border-radius:7px}}nav a.active,nav a:hover{{background:#ffffff1a;color:#fff}}
main{{max-width:100%;padding:24px}}h1{{margin:0;font-size:25px}}h2{{margin:0 0 14px}}.muted{{color:var(--muted)}}
.top{{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:18px;flex-wrap:wrap}}.top-actions{{display:flex;gap:8px;align-items:center;flex-wrap:wrap}}
.btn,button{{border:0;border-radius:7px;padding:9px 13px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;font:inherit}}.primary{{background:var(--primary);color:#fff}}.secondary{{background:#e9f2ff;color:#0c66e4}}.dark{{background:#172b4d;color:#fff}}.danger{{background:#fee4e2;color:#ae2e24}}
.toolbar{{background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px;margin-bottom:14px;display:flex;gap:8px;flex-wrap:wrap}}input,select,textarea{{border:1px solid #c7c9ce;border-radius:7px;padding:9px 10px;font:inherit;background:#fff}}input,select{{height:38px}}
.kanban{{display:flex;gap:10px;overflow-x:auto;align-items:flex-start;padding-bottom:18px;min-height:calc(100vh - 190px)}}
.column{{flex:0 0 285px;background:#e2e4e9;border-radius:10px;padding:8px;min-height:520px;display:flex;flex-direction:column}}.column-head{{display:flex;align-items:center;justify-content:space-between;padding:5px 5px 10px;font-size:13px;font-weight:800}}.count{{background:#c7c9d1;border-radius:12px;padding:2px 8px;font-size:11px}}
.dropzone{{min-height:460px;flex:1;border-radius:7px;padding:2px}}.dropzone.dragover{{background:#cfd8e6;outline:2px dashed #5790d9;outline-offset:-2px}}
.deal{{background:#fff;border-radius:7px;margin:7px 0;padding:11px;box-shadow:0 1px 2px #0000001a;cursor:grab;border:1px solid #e6e7ea}}.deal:active{{cursor:grabbing}}.deal.dragging{{opacity:.45}}.deal-top{{display:flex;justify-content:space-between;gap:7px}}.deal-id{{font-size:11px;color:#8993a4}}.deal-user{{font-weight:800;font-size:14px;margin:4px 0}}.deal-name{{font-size:12px;color:#4b5563}}.deal-product{{font-size:12px;margin:8px 0 4px;font-weight:700}}.deal-price{{font-size:13px;font-weight:800}}.deal-meta{{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}}.tag{{font-size:10px;padding:4px 6px;border-radius:5px;background:#f1f2f4;color:#44546f}}.tag.source{{background:#e9f2ff;color:#0c66e4}}.tag.manager{{background:#e7f7ef;color:#216e4e}}.tag.warn{{background:#fff1e5;color:#974f0c}}.tag.lost{{background:#fee4e2;color:#ae2e24}}.tag.bought{{background:#dcfce7;color:#166534}}
.add-card{{width:100%;border:0;background:transparent;text-align:left;color:#5e6c84;padding:9px;border-radius:6px;cursor:pointer;font-weight:700}}.add-card:hover{{background:#d2d5db;color:#172b4d}}
.grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:18px 0}}.card{{background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px}}.metric{{font-size:26px;font-weight:800;margin-top:5px}}
.tablewrap{{overflow:auto;background:#fff;border:1px solid var(--line);border-radius:10px}}table{{width:100%;border-collapse:collapse;min-width:1300px}}th,td{{padding:10px;border-bottom:1px solid var(--line);text-align:left;font-size:13px}}th{{background:#f7f8fa;position:sticky;top:0}}
.form{{background:#fff;border:1px solid var(--line);border-radius:10px;padding:20px;max-width:1100px}}.formgrid{{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}}label{{display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:700}}.full{{grid-column:1/-1}}textarea{{min-height:100px;width:100%}}.actions{{display:flex;gap:8px;margin-top:18px}}
@media(max-width:900px){{.grid{{grid-template-columns:repeat(2,1fr)}}.formgrid{{grid-template-columns:1fr}}.full{{grid-column:auto}}}}@media(max-width:600px){{main{{padding:14px}}.grid{{grid-template-columns:1fr}}nav{{padding:0 10px}}nav a{{display:none}}.column{{flex-basis:280px}}}}
</style></head><body><nav><div class="logo">Latta Putta CRM</div><a href="/" class="{'active' if title.startswith('Dashboard') else ''}">Dashboard</a><a href="/deals" class="{'active' if title.startswith('Sdelki') or title.startswith('Yangi lead') or title.startswith('Sdelkani') else ''}">Sdelki</a><a href="/table">Jadval</a><a href="/deals/new">+ Yangi lead</a></nav><main>{content}</main></body></html>'''

def dashboard():
    c=db(); total=c.execute('SELECT COUNT(*) FROM deals').fetchone()[0]; bought=c.execute("SELECT COUNT(*) FROM deals WHERE result='Sotib oldi'").fetchone()[0]; lost=c.execute("SELECT COUNT(*) FROM deals WHERE stage='Yo‘qotildi'").fetchone()[0]; sales=c.execute('SELECT COALESCE(SUM(sale_amount),0) FROM deals').fetchone()[0]; waiting=c.execute("SELECT COUNT(*) FROM deals WHERE result='Kutilmoqda' OR result='' OR result IS NULL").fetchone()[0]; c.close()
    conv=bought/total*100 if total else 0
    return page(f'''<div class="top"><div><h1>Dashboard</h1><div class="muted">Sotuv funnelining umumiy ko‘rinishi</div></div><a class="btn primary" href="/deals/new">+ Yangi lead</a></div>
<div class="grid"><div class="card"><div class="muted">Jami leadlar</div><div class="metric">{total}</div></div><div class="card"><div class="muted">Sotib oldi</div><div class="metric">{bought}</div></div><div class="card"><div class="muted">Conversion</div><div class="metric">{conv:.1f}%</div></div><div class="card"><div class="muted">Sotuv</div><div class="metric">{money(sales)} so‘m</div></div></div>
<div class="grid"><div class="card"><div class="muted">Kutilmoqda</div><div class="metric">{waiting}</div></div><div class="card"><div class="muted">Yo‘qotilgan</div><div class="metric">{lost}</div></div><div class="card"><a class="btn dark" href="/deals">Kanban board →</a></div></div>''', 'Dashboard — Latta Putta CRM')

def deal_card(r):
    today=date.today().isoformat(); overdue=bool(r['next_contact'] and r['next_contact'] < today and r['stage'] not in ['Sotib oldi','Yo‘qotildi'])
    status='bought' if r['stage']=='Sotib oldi' else 'lost' if r['stage']=='Yo‘qotildi' else 'warn' if overdue else ''
    contact=f'<span class="tag {"warn" if overdue else ""}">⚠ {esc(r["next_contact"])}</span>' if r['next_contact'] else ''
    return f'''<div class="deal" draggable="true" data-id="{r['id']}" onclick="openDeal({r['id']})"><div class="deal-top"><span class="deal-id">#{r['id']} · {esc(r['lead_date'])}</span><span>⋮</span></div><div class="deal-user">{esc(r['instagram']) or 'Instagram yo‘q'}</div><div class="deal-name">{esc(r['name'])} {('· '+esc(r['phone'])) if r['phone'] else ''}</div><div class="deal-product">{esc(r['product'])}</div><div class="deal-price">{money(r['sale_amount'] or r['product_price'])} so‘m</div><div class="deal-meta">{f'<span class="tag source">{esc(r["source"])}</span>' if r['source'] else ''}{f'<span class="tag manager">{esc(r["manager"])}</span>' if r['manager'] else ''}{contact}</div></div>'''

def kanban(qs):
    c=db(); where=[]; args=[]
    search=qs.get('q',[''])[0].strip(); source=qs.get('source',[''])[0]; manager=qs.get('manager',[''])[0]
    if search: where.append('(instagram LIKE ? OR name LIKE ? OR phone LIKE ? OR product LIKE ?)'); args += [f'%{search}%']*4
    if source: where.append('source=?'); args.append(source)
    if manager: where.append('manager=?'); args.append(manager)
    sql='SELECT * FROM deals'+((' WHERE '+' AND '.join(where)) if where else '')+' ORDER BY id DESC'
    rows=c.execute(sql,args).fetchall(); managers=[x[0] for x in c.execute("SELECT DISTINCT manager FROM deals WHERE manager<>'' ORDER BY manager").fetchall()]; c.close()
    cards={s:[] for s in STAGES}
    for r in rows: cards.setdefault(r['stage'],[]).append(r)
    columns=''
    for stage in STAGES:
        inner=''.join(deal_card(r) for r in cards.get(stage,[]))
        columns += f'''<section class="column"><div class="column-head"><span>{esc(stage)}</span><span class="count">{len(cards.get(stage,[]))}</span></div><div class="dropzone" data-stage="{esc(stage)}">{inner}</div><button class="add-card" onclick="addToStage(event, {json.dumps(stage, ensure_ascii=False)})">＋ Add card</button></section>'''
    source_opts='<option value="">Manba: Barchasi</option>'+''.join(f'<option value="{esc(x)}" {"selected" if x==source else ""}>{esc(x)}</option>' for x in SOURCES)
    manager_opts='<option value="">Menejer: Barchasi</option>'+''.join(f'<option value="{esc(x)}" {"selected" if x==manager else ""}>{esc(x)}</option>' for x in managers)
    js='''<script>
let dragged=null;
document.querySelectorAll('.deal').forEach(el=>{el.addEventListener('dragstart',()=>{dragged=el;el.classList.add('dragging')});el.addEventListener('dragend',()=>{el.classList.remove('dragging');dragged=null})});
document.querySelectorAll('.dropzone').forEach(zone=>{zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragover')});zone.addEventListener('dragleave',()=>zone.classList.remove('dragover'));zone.addEventListener('drop',async e=>{e.preventDefault();zone.classList.remove('dragover');if(!dragged)return;const id=dragged.dataset.id;const stage=zone.dataset.stage;const res=await fetch('/api/move',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:Number(id),stage})});if(res.ok)location.reload();else alert('Bosqichni o‘zgartirishda xatolik')})});
function openDeal(id){window.location='/deals/edit?id='+id}
function addToStage(e,stage){e.stopPropagation();window.location='/deals/new?stage='+encodeURIComponent(stage)}
</script>'''
    return page(f'''<div class="top"><div><h1>Sdelki — Kanban</h1><div class="muted">Kartochkani ustiga bosib oching yoki drag & drop qilib boshqa bosqichga o‘tkazing.</div></div><div class="top-actions"><a class="btn secondary" href="/table">Jadval ko‘rinishi</a><a class="btn primary" href="/deals/new">+ Yangi lead</a></div></div>
<form class="toolbar" method="get"><input name="q" value="{esc(search)}" placeholder="Instagram, ism, telefon, mahsulot..." style="min-width:280px"> <select name="source">{source_opts}</select><select name="manager">{manager_opts}</select><button class="btn primary">Filtrlash</button><a class="btn secondary" href="/deals">Tozalash</a></form>
<div class="kanban">{columns}</div>{js}''', 'Sdelki — Kanban')

def table_page(qs):
    c=db(); rows=c.execute('SELECT * FROM deals ORDER BY id DESC').fetchall(); c.close()
    tr=''.join(f'''<tr><td>{r['id']}</td><td>{esc(r['lead_date'])}</td><td><b>{esc(r['instagram'])}</b></td><td>{esc(r['name'])}</td><td>{esc(r['phone'])}</td><td>{esc(r['product'])}</td><td>{money(r['product_price'])}</td><td>{esc(r['source'])}</td><td>{esc(r['campaign'])}</td><td>{esc(r['stage'])}</td><td>{esc(r['manager'])}</td><td>{esc(r['next_contact'])}</td><td>{esc(r['result'])}</td><td>{money(r['sale_amount'])}</td><td><a class="btn secondary" href="/deals/edit?id={r['id']}">Ochish</a></td></tr>''' for r in rows)
    return page(f'''<div class="top"><div><h1>Sdelki — Jadval</h1><div class="muted">Barcha leadlarning batafsil ro‘yxati</div></div><a class="btn primary" href="/deals">← Kanban</a></div><div class="tablewrap"><table><thead><tr>{''.join(f'<th>{h}</th>' for h in ['ID','Sana','Instagram','Ism','Telefon','Mahsulot','Narx','Manba','Kampaniya','Bosqich','Menejer','Keyingi aloqa','Natija','Sotuv',''])}</tr></thead><tbody>{tr}</tbody></table></div>''', 'Sdelki — Jadval')

def form_page(deal=None, preset_stage=''):
    r=deal or {}; stage=r.get('stage') or preset_stage or STAGES[0]
    def v(k): return esc(r.get(k,''))
    def options(values, current): return ''.join(f'<option value="{esc(x)}" {"selected" if x==current else ""}>{esc(x)}</option>' for x in values)
    title='Sdelkani tahrirlash' if deal else 'Yangi lead'
    action='/deals/update' if deal else '/deals/create'
    hidden=f'<input type="hidden" name="id" value="{r.get("id","")}">' if deal else ''
    return page(f'''<div class="top"><h1>{title}</h1><a class="btn secondary" href="/deals">← Kanbanga qaytish</a></div><div class="form"><form method="post" action="{action}">{hidden}<div class="formgrid">
<label>Lead kelgan sana<input type="date" name="lead_date" value="{v('lead_date') or date.today().isoformat()}" required></label><label>Instagram username<input name="instagram" value="{v('instagram')}" placeholder="@username"></label><label>Ism<input name="name" value="{v('name')}"></label>
<label>Telefon<input name="phone" value="{v('phone')}"></label><label>Mahsulot<input name="product" value="{v('product')}"></label><label>Mahsulot narxi<input type="number" name="product_price" value="{v('product_price')}"></label>
<label>Manba<select name="source"><option value=""></option>{options(SOURCES,r.get('source',''))}</select></label><label>Kampaniya<input name="campaign" value="{v('campaign')}"></label><label>Bosqich<select name="stage">{options(STAGES,stage)}</select></label>
<label>Yo‘qotish sababi<select name="loss_reason"><option value=""></option>{options(LOSS_REASONS,r.get('loss_reason',''))}</select></label><label>Menejer<input name="manager" value="{v('manager')}"></label><label>Oxirgi aloqa<input type="date" name="last_contact" value="{v('last_contact')}"></label>
<label>Keyingi aloqa<input type="date" name="next_contact" value="{v('next_contact')}"></label><label>Natija<select name="result"><option value=""></option>{options(RESULTS,r.get('result',''))}</select></label><label>Sotuv summasi<input type="number" name="sale_amount" value="{v('sale_amount')}"></label>
<label>Buyurtma ID<input name="order_id" value="{v('order_id')}"></label><label class="full">Izoh<textarea name="note" placeholder="Mijoz nima dedi, qayerda to‘xtadi, keyingi qadam...">{v('note')}</textarea></label></div><div class="actions"><button class="btn primary">Saqlash</button><a class="btn secondary" href="/deals">Bekor qilish</a>{('<a class="btn danger" href="/deals/delete?id='+str(r['id'])+'" onclick="return confirm(\'O‘chirishni tasdiqlaysizmi?\')">O‘chirish</a>' if deal else '')}</div></form></div>''', title)

def parse_form(handler):
    n=int(handler.headers.get('Content-Length','0')); raw=handler.rfile.read(n).decode(); return {k:v[-1] for k,v in parse_qs(raw).items()}

def save(data, update=False):
    c=db(); now=datetime.now().isoformat(timespec='seconds')
    fields=['lead_date','instagram','name','phone','product','product_price','source','campaign','stage','loss_reason','manager','last_contact','next_contact','result','sale_amount','order_id','note']
    vals=[data.get(f,'') for f in fields]
    for i in [5,14]:
        try: vals[i]=float(vals[i] or 0)
        except: vals[i]=0
    if update:
        sets=','.join(f'{f}=?' for f in fields); c.execute(f'UPDATE deals SET {sets},updated_at=? WHERE id=?', vals+[now,int(data['id'])])
    else:
        c.execute(f'INSERT INTO deals({",".join(fields)},created_at,updated_at) VALUES({",".join("?" for _ in fields)},?,?)', vals+[now,now])
    c.commit(); c.close()

def move_stage(data):
    if data.get('stage') not in STAGES: raise ValueError('Noto‘g‘ri bosqich')
    c=db(); c.execute('UPDATE deals SET stage=?,updated_at=? WHERE id=?',(data['stage'],datetime.now().isoformat(timespec='seconds'),int(data['id']))); c.commit(); c.close()

class Handler(BaseHTTPRequestHandler):
    def send(self, body, status=200, content_type='text/html; charset=utf-8'):
        b=body.encode(); self.send_response(status); self.send_header('Content-Type',content_type); self.send_header('Content-Length',str(len(b))); self.end_headers(); self.wfile.write(b)
    def redirect(self,url): self.send_response(303); self.send_header('Location',url); self.end_headers()
    def do_GET(self):
        u=urlparse(self.path); qs=parse_qs(u.query); p=u.path
        try:
            if p=='/': self.send(dashboard())
            elif p=='/deals': self.send(kanban(qs))
            elif p=='/table': self.send(table_page(qs))
            elif p=='/deals/new': self.send(form_page(preset_stage=qs.get('stage',[''])[0]))
            elif p=='/deals/edit':
                c=db(); r=c.execute('SELECT * FROM deals WHERE id=?',(int(qs.get('id',['0'])[0]),)).fetchone(); c.close(); self.send(form_page(dict(r)) if r else 'Not found',404 if not r else 200)
            elif p=='/deals/delete':
                c=db(); c.execute('DELETE FROM deals WHERE id=?',(int(qs.get('id',['0'])[0]),)); c.commit(); c.close(); self.redirect('/deals')
            else: self.send('404',404)
        except Exception as e: self.send('<h1>Xatolik</h1><pre>'+esc(e)+'</pre>',500)
    def do_POST(self):
        p=urlparse(self.path).path
        try:
            if p=='/api/move':
                n=int(self.headers.get('Content-Length','0')); data=json.loads(self.rfile.read(n).decode()); move_stage(data); self.send(json.dumps({'ok':True}),content_type='application/json')
            else:
                data=parse_form(self)
                if p=='/deals/create': save(data,False); self.redirect('/deals')
                elif p=='/deals/update': save(data,True); self.redirect('/deals')
                else: self.send('404',404)
        except Exception as e: self.send('<h1>Xatolik</h1><pre>'+esc(e)+'</pre>',500)

if __name__=='__main__':
    init_db(); print(f'Latta Putta CRM: http://{HOST}:{PORT}')
    ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()
