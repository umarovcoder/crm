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
    c=sqlite3.connect(DB); c.row_factory=sqlite3.Row; return c

def init_db():
    c=db(); c.execute(SCHEMA)
    if c.execute('SELECT COUNT(*) FROM deals').fetchone()[0] == 0:
        now=datetime.now().isoformat(timespec='seconds')
        samples=[
        ('2026-09-07','@malika_01','Malika','90...','Kostyum yubka',255000,'Instagram Target','Kostyum-01','Yangi lead','','Ali','','2026-09-08','Kutilmoqda',0,'',''),
        ('2026-09-07','@dilnoza_22','Dilnoza','91...','Kostyum yubka',255000,'Instagram Target','Kostyum-01','Narx aytildi','','Ali','2026-09-07','2026-09-07','Kutilmoqda',0,'',''),
        ('2026-09-07','@madina_style','Madina','93...','Kostyum yubka',255000,'Instagram Organic','','Sotib oldi','','Ali','2026-09-07','','Sotib oldi',255000,'44',''),
        ('2026-09-07','@nargiza_777','Nargiza','95...','Kostyum yubka',255000,'Instagram Target','Kostyum-01','Yo‘qotildi','Qimmat','Ali','2026-09-07','','Sotib olmadi',0,'',''),
        ]
        for s in samples:
            c.execute('''INSERT INTO deals(lead_date,instagram,name,phone,product,product_price,source,campaign,stage,loss_reason,manager,last_contact,next_contact,result,sale_amount,order_id,note,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''', s+(now,now))
    c.commit(); c.close()

def esc(x): return html.escape(str(x or ''))
def money(x):
    try: return f"{float(x):,.0f}".replace(',',' ')
    except: return '0'

def page(content, title='Latta Putta CRM'):
    return f'''<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)}</title>
<style>
:root{{--bg:#f5f7fb;--card:#fff;--text:#172033;--muted:#6b7280;--line:#e5e7eb;--primary:#2563eb;--danger:#dc2626;--green:#16a34a;--yellow:#d97706}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);font-family:Inter,Arial,sans-serif;color:var(--text)}}
nav{{height:64px;background:#111827;color:#fff;display:flex;align-items:center;padding:0 28px;gap:24px}}nav .logo{{font-weight:800;font-size:20px}}nav a{{color:#d1d5db;text-decoration:none}}nav a.active,nav a:hover{{color:#fff}}
main{{max-width:1500px;margin:28px auto;padding:0 20px}}h1{{margin:0 0 8px;font-size:28px}}h2{{margin:0 0 18px}}.muted{{color:var(--muted)}}
.grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:20px 0}}.card{{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;box-shadow:0 2px 8px #00000008}}.metric{{font-size:28px;font-weight:800;margin-top:7px}}
.toolbar{{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}}input,select,textarea{{border:1px solid #d1d5db;border-radius:9px;padding:10px 11px;font:inherit;background:#fff}}input,select{{height:40px}}textarea{{min-height:90px;width:100%}}button,.btn{{border:0;border-radius:9px;padding:10px 14px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block}}.primary{{background:var(--primary);color:#fff}}.secondary{{background:#eef2ff;color:#1e40af}}.danger{{background:#fee2e2;color:#991b1b}}.dark{{background:#111827;color:#fff}}
.tablewrap{{overflow:auto;background:#fff;border:1px solid var(--line);border-radius:14px}}table{{width:100%;border-collapse:collapse;min-width:1300px}}th,td{{padding:11px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle;font-size:13px}}th{{background:#f9fafb;position:sticky;top:0;z-index:1}}tr:hover td{{background:#fafafa}}
.badge{{display:inline-block;padding:5px 8px;border-radius:999px;font-size:12px;font-weight:700;background:#eef2ff;color:#3730a3}}.bought{{background:#dcfce7;color:#166534}}.lost{{background:#fee2e2;color:#991b1b}}.wait{{background:#fef3c7;color:#92400e}}.overdue{{color:#b91c1c;font-weight:800}}
.form{{background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px}}.formgrid{{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}}label{{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:700}}.full{{grid-column:1/-1}}.actions{{display:flex;gap:10px;margin-top:18px}}
.funnel{{display:grid;gap:8px}}.frow{{display:grid;grid-template-columns:220px 1fr 70px;align-items:center;gap:10px}}.bar{{height:14px;background:#e5e7eb;border-radius:999px;overflow:hidden}}.bar i{{display:block;height:100%;background:var(--primary)}}
@media(max-width:900px){{.grid{{grid-template-columns:repeat(2,1fr)}}.formgrid{{grid-template-columns:1fr}}.full{{grid-column:auto}}}}
@media(max-width:550px){{.grid{{grid-template-columns:1fr}}nav{{padding:0 14px}}nav a{{display:none}}main{{padding:0 10px}}}}
</style></head><body><nav><div class="logo">Latta Putta CRM</div><a class="active" href="/">Dashboard</a><a href="/deals">Sdelki</a><a href="/deals/new">+ Yangi lead</a></nav><main>{content}</main></body></html>'''

def dashboard():
    c=db(); total=c.execute('SELECT COUNT(*) n FROM deals').fetchone()['n']; bought=c.execute("SELECT COUNT(*) n FROM deals WHERE result='Sotib oldi'").fetchone()['n']; lost=c.execute("SELECT COUNT(*) n FROM deals WHERE stage='Yo‘qotildi'").fetchone()['n']; waiting=c.execute("SELECT COUNT(*) n FROM deals WHERE result='Kutilmoqda' OR result IS NULL OR result='' ").fetchone()['n']; sales=c.execute('SELECT COALESCE(SUM(sale_amount),0) n FROM deals').fetchone()['n']; overdue=c.execute("SELECT COUNT(*) n FROM deals WHERE next_contact<>'' AND next_contact < date('now') AND stage NOT IN ('Sotib oldi','Yo‘qotildi')").fetchone()['n']
    rows=c.execute('SELECT stage,COUNT(*) n FROM deals GROUP BY stage ORDER BY n DESC').fetchall(); c.close()
    maxn=max([r['n'] for r in rows] or [1])
    funnel=''.join(f'<div class="frow"><span>{esc(r["stage"])}</span><div class="bar"><i style="width:{r["n"]/maxn*100:.1f}%"></i></div><b>{r["n"]}</b></div>' for r in rows)
    conv=(bought/total*100) if total else 0
    return page(f'''<h1>Dashboard</h1><div class="muted">Lead → aloqa → buyurtma → sotuv jarayonini bir joydan boshqaring.</div>
<div class="grid"><div class="card"><div class="muted">Jami leadlar</div><div class="metric">{total}</div></div><div class="card"><div class="muted">Sotib olganlar</div><div class="metric">{bought}</div></div><div class="card"><div class="muted">Conversion</div><div class="metric">{conv:.1f}%</div></div><div class="card"><div class="muted">Sotuv summasi</div><div class="metric">{money(sales)} so‘m</div></div></div>
<div class="grid"><div class="card"><div class="muted">Yo‘qotilgan</div><div class="metric">{lost}</div></div><div class="card"><div class="muted">Kutilayotgan</div><div class="metric">{waiting}</div></div><div class="card"><div class="muted">Bugun/oldin follow-up</div><div class="metric">{overdue}</div></div><div class="card"><a class="btn primary" href="/deals/new">+ Yangi lead qo‘shish</a></div></div>
<div class="card"><h2>Funnel</h2><div class="funnel">{funnel or '<span class="muted">Hali ma’lumot yo‘q</span>'}</div></div>''')

def deals_page(qs):
    c=db(); where=[]; args=[]
    search=qs.get('q',[''])[0].strip(); stage=qs.get('stage',[''])[0]; source=qs.get('source',[''])[0]; manager=qs.get('manager',[''])[0]; result=qs.get('result',[''])[0]
    if search: where.append('(instagram LIKE ? OR name LIKE ? OR phone LIKE ? OR product LIKE ?)'); args += [f'%{search}%']*4
    if stage: where.append('stage=?'); args.append(stage)
    if source: where.append('source=?'); args.append(source)
    if manager: where.append('manager=?'); args.append(manager)
    if result: where.append('result=?'); args.append(result)
    sql='SELECT * FROM deals'+((' WHERE '+' AND '.join(where)) if where else '')+' ORDER BY id DESC'
    rows=c.execute(sql,args).fetchall(); managers=[r[0] for r in c.execute("SELECT DISTINCT manager FROM deals WHERE manager<>'' ORDER BY manager").fetchall()]; c.close()
    def sel(name, values, current):
        return '<select name="'+name+'"><option value="">'+name.title()+': Barchasi</option>'+''.join(f'<option value="{esc(v)}" {"selected" if v==current else ""}>{esc(v)}</option>' for v in values)+'</select>'
    tr=''
    for r in rows:
        cls='bought' if r['result']=='Sotib oldi' else 'lost' if r['stage']=='Yo‘qotildi' else 'wait' if r['result']=='Kutilmoqda' else ''
        overdue = r['next_contact'] and r['next_contact'] < date.today().isoformat() and r['stage'] not in ['Sotib oldi','Yo‘qotildi']
        tr += f'''<tr><td>{r['id']}</td><td>{esc(r['lead_date'])}</td><td><b>{esc(r['instagram'])}</b></td><td>{esc(r['name'])}</td><td>{esc(r['phone'])}</td><td>{esc(r['product'])}</td><td>{money(r['product_price'])}</td><td>{esc(r['source'])}</td><td>{esc(r['campaign'])}</td><td><span class="badge {cls}">{esc(r['stage'])}</span></td><td>{esc(r['loss_reason'])}</td><td>{esc(r['manager'])}</td><td>{esc(r['last_contact'])}</td><td class="{'overdue' if overdue else ''}">{esc(r['next_contact'])}{' ⚠' if overdue else ''}</td><td>{esc(r['result'])}</td><td>{money(r['sale_amount'])}</td><td>{esc(r['order_id'])}</td><td><a class="btn secondary" href="/deals/edit?id={r['id']}">Ochish</a></td></tr>'''
    return page(f'''<h1>Sdelki <span class="muted">({len(rows)})</span></h1><div class="toolbar"><form style="display:flex;gap:10px;flex-wrap:wrap;width:100%" method="get"><input name="q" value="{esc(search)}" placeholder="Instagram, ism, telefon, mahsulot...">{sel('stage',STAGES,stage)}{sel('source',SOURCES,source)}{sel('manager',managers,manager)}{sel('result',RESULTS,result)}<button class="primary">Filtrlash</button><a class="btn secondary" href="/deals">Tozalash</a><a class="btn dark" href="/deals/new">+ Yangi lead</a></form></div><div class="tablewrap"><table><thead><tr>{''.join('<th>'+esc(h)+'</th>' for h in ['ID','Sana','Instagram','Ism','Telefon','Mahsulot','Narx','Manba','Kampaniya','Bosqich','Yo‘qotish sababi','Menejer','Oxirgi aloqa','Keyingi aloqa','Natija','Sotuv','Buyurtma ID',''])}</tr></thead><tbody>{tr or '<tr><td colspan="18" style="text-align:center;padding:40px">Lead topilmadi</td></tr>'}</tbody></table></div>''')

def form_page(deal=None):
    r=deal or {}
    def v(k): return esc(r.get(k,''))
    def options(values,k):
        cur=r.get(k,''); return ''.join(f'<option value="{esc(x)}" {"selected" if x==cur else ""}>{esc(x)}</option>' for x in values)
    title='Sdelkani tahrirlash' if deal else 'Yangi lead'
    action='/deals/update' if deal else '/deals/create'
    hidden=f'<input type="hidden" name="id" value="{r.get("id","")}">' if deal else ''
    return page(f'''<h1>{title}</h1><div class="form"><form method="post" action="{action}">{hidden}<div class="formgrid">
<label>Lead kelgan sana<input type="date" name="lead_date" value="{v('lead_date') or date.today().isoformat()}" required></label>
<label>Instagram username<input name="instagram" value="{v('instagram')}" placeholder="@username"></label><label>Ism<input name="name" value="{v('name')}"></label>
<label>Telefon<input name="phone" value="{v('phone')}"></label><label>Mahsulot<input name="product" value="{v('product')}"></label><label>Mahsulot narxi<input type="number" name="product_price" value="{v('product_price')}"></label>
<label>Manba<select name="source"><option value=""></option>{options(SOURCES,'source')}</select></label><label>Kampaniya<input name="campaign" value="{v('campaign')}" placeholder="Kostyum-01"></label><label>Bosqich<select name="stage"><option value=""></option>{options(STAGES,'stage')}</select></label>
<label>Yo‘qotish sababi<select name="loss_reason"><option value=""></option>{options(LOSS_REASONS,'loss_reason')}</select></label><label>Menejer<input name="manager" value="{v('manager')}"></label><label>Oxirgi aloqa<input type="date" name="last_contact" value="{v('last_contact')}"></label>
<label>Keyingi aloqa<input type="date" name="next_contact" value="{v('next_contact')}"></label><label>Natija<select name="result"><option value=""></option>{options(RESULTS,'result')}</select></label><label>Sotuv summasi<input type="number" name="sale_amount" value="{v('sale_amount')}"></label>
<label>Buyurtma ID<input name="order_id" value="{v('order_id')}"></label><label class="full">Izoh<textarea name="note" placeholder="Mijoz nima dedi, qayerda to‘xtadi, keyingi qadam...">{v('note')}</textarea></label></div><div class="actions"><button class="primary">Saqlash</button><a class="btn secondary" href="/deals">Bekor qilish</a>{('<a class="btn danger" href="/deals/delete?id='+str(r['id'])+'" onclick="return confirm(\'O‘chirishni tasdiqlaysizmi?\')">O‘chirish</a>' if deal else '')}</div></form></div>''')

def parse_form(handler):
    n=int(handler.headers.get('Content-Length','0')); raw=handler.rfile.read(n).decode(); return {k:v[-1] for k,v in parse_qs(raw).items()}

def save(data, update=False):
    c=db(); now=datetime.now().isoformat(timespec='seconds')
    fields=['lead_date','instagram','name','phone','product','product_price','source','campaign','stage','loss_reason','manager','last_contact','next_contact','result','sale_amount','order_id','note']
    vals=[data.get(f,'') for f in fields]
    for i in [5,15]:
        try: vals[i]=float(vals[i] or 0)
        except: vals[i]=0
    if update:
        sets=','.join(f'{f}=?' for f in fields); c.execute(f'UPDATE deals SET {sets},updated_at=? WHERE id=?', vals+[now,int(data['id'])])
    else:
        c.execute(f'INSERT INTO deals({",".join(fields)},created_at,updated_at) VALUES({",".join("?" for _ in fields)},?,?)', vals+[now,now])
    c.commit(); c.close()

class Handler(BaseHTTPRequestHandler):
    def send(self, body, status=200):
        b=body.encode(); self.send_response(status); self.send_header('Content-Type','text/html; charset=utf-8'); self.send_header('Content-Length',str(len(b))); self.end_headers(); self.wfile.write(b)
    def redirect(self,url): self.send_response(303); self.send_header('Location',url); self.end_headers()
    def do_GET(self):
        u=urlparse(self.path); qs=parse_qs(u.query); p=u.path
        try:
            if p=='/': self.send(dashboard())
            elif p=='/deals': self.send(deals_page(qs))
            elif p=='/deals/new': self.send(form_page())
            elif p=='/deals/edit':
                c=db(); r=c.execute('SELECT * FROM deals WHERE id=?',(int(qs.get('id',['0'])[0]),)).fetchone(); c.close(); self.send(form_page(dict(r)) if r else 'Not found',404 if not r else 200)
            elif p=='/deals/delete':
                c=db(); c.execute('DELETE FROM deals WHERE id=?',(int(qs.get('id',['0'])[0]),)); c.commit(); c.close(); self.redirect('/deals')
            elif p=='/api/stats':
                c=db(); data={'total':c.execute('SELECT COUNT(*) FROM deals').fetchone()[0],'bought':c.execute("SELECT COUNT(*) FROM deals WHERE result='Sotib oldi'").fetchone()[0]}; c.close(); self.send(json.dumps(data))
            else: self.send('404',404)
        except Exception as e: self.send('<h1>Xatolik</h1><pre>'+esc(e)+'</pre>',500)
    def do_POST(self):
        p=urlparse(self.path).path
        try:
            data=parse_form(self)
            if p=='/deals/create': save(data,False); self.redirect('/deals')
            elif p=='/deals/update': save(data,True); self.redirect('/deals')
            else: self.send('404',404)
        except Exception as e: self.send('<h1>Xatolik</h1><pre>'+esc(e)+'</pre>',500)

if __name__=='__main__':
    init_db(); print(f'Latta Putta CRM: http://{HOST}:{PORT}')
    ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()
