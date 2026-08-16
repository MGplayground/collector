import { chromium } from 'playwright'
import fs from 'fs'

const HOST = 'https://oidnhbmhjzcrvyjjfmes.supabase.co'
const USER = { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated',
               email: 'mauro@call.io', created_at: '2026-01-01T00:00:00Z', app_metadata: {}, user_metadata: {} }
const SESSION = { access_token: 'stub-token', token_type: 'bearer', expires_in: 3600,
                  expires_at: Math.floor(Date.now()/1000)+3600, refresh_token: 'stub-refresh', user: USER }

let ITEMS = [
  { id:'a1', name:'Umbreon ex 161/131 (Prismatic Evolutions)', category:'pokemon', status:'owned', item_type:'card',
    is_raw:false, grade_company:'PSA', grade:'9', purchase_price:900, current_value:1050, quantity:1,
    image_url:null, cert_number:'140842521', created_at:'2026-02-01T00:00:00Z' },
  { id:'a2', name:'Riftbound Vendetta Booster Box', category:'riftbound', status:'owned', item_type:'booster_box',
    is_raw:true, grade_company:null, grade:null, purchase_price:119.95, current_value:119.95, quantity:1,
    image_url:null, created_at:'2026-03-01T00:00:00Z' },
]

const captured = { insert: null, uploadBytes: 0, uploadPath: null, uploadType: null }
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 })
const errs = []
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message))
p.on('console', m => { if (m.type()==='error') errs.push('CONSOLE: ' + m.text().slice(0,140)) })

const json = (route, body, status=200) =>
  route.fulfill({ status, contentType:'application/json',
    headers:{ 'access-control-allow-origin':'*', 'access-control-expose-headers':'*' }, body: JSON.stringify(body) })

await p.route(`${HOST}/**`, async route => {
  const req = route.request(), url = req.url(), method = req.method()
  if (method === 'OPTIONS') return route.fulfill({ status:204, headers:{
    'access-control-allow-origin':'*','access-control-allow-methods':'*','access-control-allow-headers':'*' } })

  if (url.includes('/auth/v1/token'))  return json(route, SESSION)
  if (url.includes('/auth/v1/user'))   return json(route, USER)
  if (url.includes('/auth/v1/logout')) return json(route, {})

  if (url.includes('/storage/v1/object/card-images/')) {
    captured.uploadBytes = req.postDataBuffer()?.length ?? 0
    captured.uploadPath  = url.split('/card-images/')[1]
    captured.uploadType  = req.headers()['content-type']
    return json(route, { Key: 'card-images/' + captured.uploadPath })
  }
  if (url.includes('/storage/v1/object/public/card-images/'))
    return route.fulfill({ status:200, contentType:'image/jpeg',
      headers:{'access-control-allow-origin':'*'}, body: fs.readFileSync(new URL('./big-photo.jpg', import.meta.url).pathname) })

  if (url.includes('/rest/v1/items')) {
    if (method === 'GET')  return json(route, ITEMS)
    if (method === 'POST') {
      captured.insert = JSON.parse(req.postData())
      const row = { id:'new-1', created_at:new Date().toISOString(), ...captured.insert }
      ITEMS = [row, ...ITEMS]
      // PostgREST returns a bare object when .single() sets this Accept header
      const single = (req.headers()['accept'] || '').includes('vnd.pgrst.object')
      return json(route, single ? row : [row], 201)
    }
    if (method === 'DELETE') return json(route, [])
  }
  if (url.includes('/rest/v1/price_history')) return json(route, [])
  return json(route, [])
})

await p.goto('http://localhost:5173/', { waitUntil:'domcontentloaded' })
await p.fill('input[type=email]', 'mauro@call.io')
await p.fill('input[type=password]', 'collector')
await p.click('button[type=submit]')
await p.waitForSelector('.item-filters', { timeout: 15000 })
console.log('login + collection render : OK')
await p.waitForTimeout(600)
console.log('list rows                 :', await p.locator('.item-card').count())

await p.click('.view-toggle__btn:has-text("Vault")')
await p.waitForTimeout(600)
console.log('vault tiles               :', await p.locator('.vault-tile').count(),
            '| slab:', await p.locator('.vault-tile__slab').count(),
            '| sealed:', await p.locator('.vault-tile--sealed').count(),
            '| placeholder:', await p.locator('.vault-tile__placeholder').count())
await p.screenshot({ path:'/tmp/stub-vault-before.png', fullPage:true })

await p.reload({ waitUntil:'domcontentloaded' })
await p.waitForSelector('.item-filters', { timeout: 15000 })
await p.waitForTimeout(900)
console.log('view persisted over reload:', await p.locator('.vault-tile').count() > 0)

// --- add sealed item with photo ---
await p.click('button:has-text("+ Add")')
await p.waitForSelector('.form-grid')
await p.fill('input[required]', 'ZZ Stub Test Box')
await p.selectOption('.form-label:has-text("Type") select', 'booster_box')
await p.waitForTimeout(200)
console.log('grading UI hidden (sealed):', await p.locator('.form-label:has-text("Grading company")').count() === 0,
            '| raw checkbox hidden:', await p.locator('.form-label--row').count() === 0)

const t0 = Date.now()
await p.setInputFiles('.image-upload__input', new URL('./big-photo.jpg', import.meta.url).pathname)
await p.waitForSelector('.image-upload__preview:not(.image-upload__preview--empty)', { timeout: 60000 })
const secs = ((Date.now()-t0)/1000).toFixed(1)
const orig = fs.statSync(new URL('./big-photo.jpg', import.meta.url).pathname).size
console.log(`compress+upload           : ${(orig/1024/1024).toFixed(2)}MB -> ${(captured.uploadBytes/1024).toFixed(0)}KB in ${secs}s`)
console.log('upload path / mime        :', captured.uploadPath, '/', captured.uploadType)

await p.fill('.form-label:has-text("Current value") input', '119.95')
await p.click('button[type=submit]')
await p.waitForTimeout(1200)
console.log('insert payload            :', JSON.stringify({
  item_type: captured.insert?.item_type, is_raw: captured.insert?.is_raw,
  grade: captured.insert?.grade, grade_company: captured.insert?.grade_company,
  image_url: captured.insert?.image_url ? '…/' + captured.insert.image_url.split('/').pop() : null }))

await p.click('.view-toggle__btn:has-text("Vault")')
await p.waitForTimeout(1200)
console.log('vault tiles after add     :', await p.locator('.vault-tile').count(),
            '| real photos:', await p.locator('.vault-tile__img').count())
await p.screenshot({ path:'/tmp/stub-vault-after.png', fullPage:true })

console.log('captions                  :', JSON.stringify(await p.locator('.vault-caption__meta').allTextContents()));
console.log('js errors                 :', errs.filter(e=>!e.includes('ERR_CONNECTION_RESET')).length ? errs : 'fonts only (egress)')
await b.close()
