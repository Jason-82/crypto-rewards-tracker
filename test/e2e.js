const { chromium } = require('playwright');
const W = '7Tug5Qgqcnnf16FNqwDqFVx2YV6UVMVnhmJZXdGJmUVb';
const DIST = 'DistributorWa11et1111111111111111111111111111';
const STONK = 'DC6HP2A7SUy49WeazfeWgbwxVpzKdEPuB46mtb7XBzWx';
const ZEC = 'ZecMint111111111111111111111111111111111111';
const KNOTS = 'KnotsMint1111111111111111111111111111111111';
const now = Math.floor(Date.now()/1000);
// Solscan mock: 2 STONK payouts, 1 ZEC payout, 1 KNOTS buy (STONK out, KNOTS in) -> excluded
const solscanRows = [
  { trans_id:'sigA', block_time: now-3600, flow:'in', from_address:DIST, to_address:W, token_address:STONK, token_decimals:6, amount:'1500000' },
  { trans_id:'sigB', block_time: now-7200, flow:'in', from_address:DIST, to_address:W, token_address:STONK, token_decimals:6, amount:'2500000' },
  { trans_id:'sigC', block_time: now-9000, flow:'in', from_address:'ZecDist', to_address:W, token_address:ZEC, token_decimals:8, amount:'12345678' },
  { trans_id:'sigD', block_time: now-10000, flow:'out', from_address:W, to_address:'pool', token_address:STONK, token_decimals:6, amount:'9000000' },
  { trans_id:'sigD', block_time: now-10000, flow:'in', from_address:'pool', to_address:W, token_address:KNOTS, token_decimals:6, amount:'777000000' },
  { trans_id:'sigOld', block_time: now-40*86400, flow:'in', from_address:DIST, to_address:W, token_address:STONK, token_decimals:6, amount:'1000000' },
];
function tokBal(idx, mint, owner, amt, dec){ return { accountIndex: idx, mint, owner, uiTokenAmount:{ amount:String(amt), decimals:dec } }; }
const rpcTxs = {
  sigA: { blockTime: now-3600, meta:{ err:null, fee:5000, preBalances:[10,20,30], postBalances:[10-5000,20,30],
      preTokenBalances:[tokBal(1,STONK,DIST,100000000,6), tokBal(2,STONK,W,0,6)], postTokenBalances:[tokBal(1,STONK,DIST,98500000,6), tokBal(2,STONK,W,1500000,6)] },
    transaction:{ message:{ accountKeys:[{pubkey:DIST,signer:true},{pubkey:'distAta',signer:false},{pubkey:'myAta',signer:false}] } } },
  sigD: { blockTime: now-10000, meta:{ err:null, fee:5000, preBalances:[10,20,30,40], postBalances:[10-5000,20,30,40],
      preTokenBalances:[tokBal(1,STONK,W,9000000,6), tokBal(2,KNOTS,W,0,6), tokBal(3,KNOTS,'pool',1e12,6)], postTokenBalances:[tokBal(1,STONK,W,0,6), tokBal(2,KNOTS,W,777000000,6), tokBal(3,KNOTS,'pool',1e12-777000000,6)] },
    transaction:{ message:{ accountKeys:[{pubkey:W,signer:true},{pubkey:'a',signer:false},{pubkey:'b',signer:false},{pubkey:'c',signer:false}] } } },
};
(async () => {
  const browser = await chromium.launch({ args:['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  page.on('console', m => { if (m.type()==='error') console.log('CONSOLE', m.text()); });
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith('file://')) return route.continue();
    const json = (b) => route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(b) });
    if (url.includes('pro-api.solscan.io/v2.0/account/transfer')) {
      const u = new URL(url); if (u.searchParams.get('page')!=='1') return json({success:true,data:[]});
      if (route.request().headers()['token']!=='TESTKEY') return route.fulfill({status:401, body:'no key'});
      const from = Number(u.searchParams.get('from_time')); return json({ success:true, data: solscanRows.filter(r => r.block_time>=from) });
    }
    if (url.includes('token/meta/multi')) return json({ success:true, data:[{address:STONK,symbol:'STONK',name:'StonkFun',decimals:6,price:0.25},{address:ZEC,symbol:'ZEC',name:'Zcash (tokenized)',decimals:8,price:50}] });
    if (url.includes('lite-api.jup.ag')) { const q = new URL(url).searchParams.get('query'); return json(q===ZEC?[{id:ZEC,symbol:'ZEC',name:'Zcash',decimals:8,usdPrice:50}]:[]); }
    if (url.startsWith('https://rpc.test/')) {
      const body = route.request().postDataJSON();
      const handle = (req) => {
        const { method, params } = req; let result;
        if (method==='getTokenAccountsByOwner') result = { value: params[1].programId.startsWith('Tokenkeg') ? [ { pubkey:'myAta', account:{ data:{ parsed:{ info:{ mint:STONK, tokenAmount:{decimals:6} } } } } }, { pubkey:'myKnots', account:{ data:{ parsed:{ info:{ mint:KNOTS, tokenAmount:{decimals:6} } } } } } ] : [] };
        else if (method==='getSignaturesForAddress') result = params[0]==='myAta' ? [ {signature:'sigA', blockTime:now-3600, err:null}, {signature:'sigD', blockTime:now-10000, err:null}, {signature:'sigOld', blockTime:now-40*86400, err:null} ] : [ {signature:'sigD', blockTime:now-10000, err:null} ];
        else if (method==='getTransaction') result = rpcTxs[params[0]] || null;
        else throw new Error('unexpected '+method);
        return { jsonrpc:'2.0', id:req.id, result };
      };
      return json(Array.isArray(body) ? body.map(handle) : handle(body));
    }
    console.log('UNMOCKED', url); return route.abort();
  });
  await page.goto('file://' + require('path').resolve(__dirname, '..', 'index.html'));
  await page.fill('#addresses', W + ' main');
  await page.selectOption('#period', '7');
  // --- Solscan provider ---
  await page.selectOption('#provider', 'solscan'); await page.fill('#solscanKey', 'TESTKEY');
  await page.click('#run'); await page.waitForFunction(() => document.getElementById('run').disabled===false);
  console.log('STATUS(solscan):', await page.textContent('#status'));
  console.log(await page.$eval('#summary', e => e.innerText));
  // set an estimate and check comparison line
  await page.fill('[data-est="'+STONK+'"]', '0.5'); await page.press('[data-est="'+STONK+'"]', 'Tab');
  console.log('EST LINE:', await page.$eval('.card .inline .hint', e => e.innerText));
  // --- RPC provider ---
  await page.selectOption('#provider', 'rpc'); await page.fill('#rpcUrl', 'https://rpc.test/');
  await page.click('#run'); await page.waitForFunction(() => document.getElementById('run').disabled===false);
  console.log('STATUS(rpc):', await page.textContent('#status'));
  console.log(await page.$eval('#summary', e => e.innerText));
  console.log('LOG:\n' + await page.textContent('#log'));
  // loose mode should include the KNOTS buy
  await page.selectOption('#strict', 'loose'); await page.click('#run'); await page.waitForFunction(() => document.getElementById('run').disabled===false);
  console.log('LOOSE:', await page.$eval('#summary', e => e.innerText.split('\n').slice(0,6).join(' | ')));
  await page.screenshot({ path: require('path').join(__dirname, 'shot.png'), fullPage: true });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
