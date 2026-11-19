import {calculate, validateDraft} from './money.js';
const $=id=>document.getElementById(id);
const key='quote-desk.v1';
const fresh=()=>({version:1,seller:'',client:'',project:'',reference:'Q-'+new Date().toISOString().slice(0,10).replaceAll('-',''),notes:'',currency:'USD',discount:'0',tax:'0',items:[{description:'',qty:'1',price:'0'}]});
let state=fresh();
const status=(text,error=false)=>{$('status').textContent=text;$('status').classList.toggle('error',error);};
const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:state.currency}).format(Number(cents)/100);
function preview(){
  try{
    const result=calculate(state.items,state.discount,state.tax);
    $('preview-ref').textContent=state.reference;
    $('preview-seller').textContent=state.seller||'Your studio';
    $('preview-client').textContent=state.client||'Your client';
    $('preview-project').textContent=state.project||'Your next project';
    $('preview-notes').textContent=state.notes;
    $('preview-items').replaceChildren();
    state.items.forEach((item,index)=>{
      const row=document.createElement('div');row.className='preview-line';
      const text=document.createElement('span');text.textContent=item.description||'New deliverable';
      const total=document.createElement('span');total.textContent=money(result.lines[index]);
      row.append(text,total);$('preview-items').append(row);
      document.querySelectorAll('.row-total')[index].textContent=money(result.lines[index]);
    });
    for(const [id,value] of [['subtotal',result.subtotal],['discount-total',result.discount],['tax-total',result.tax],['grand-total',result.total]]) $(id).textContent=money(value);
    $('item-count').textContent=state.items.length+' line item'+(state.items.length===1?'':'s');
    $('print').disabled=false;status('');return true;
  }catch(error){status(error.message,true);$('grand-total').textContent='Check inputs';$('print').disabled=true;return false;}
}
function renderItems(){
  $('items').replaceChildren();
  state.items.forEach((item,index)=>{
    const row=document.createElement('tr');
    for(const field of ['description','qty','price']){
      const cell=document.createElement('td');const input=document.createElement('input');
      input.value=item[field];input.setAttribute('aria-label',`${field==='description'?'Deliverable':field==='qty'?'Quantity':'Unit price'} ${index+1}`);
      input.maxLength=field==='description'?300:18;if(field!=='description')input.inputMode='decimal';
      input.addEventListener('input',()=>{state.items[index][field]=input.value;preview();});
      cell.append(input);row.append(cell);
    }
    const total=document.createElement('td');total.className='row-total';row.append(total);
    const cell=document.createElement('td');const remove=document.createElement('button');remove.className='remove';remove.textContent='×';remove.setAttribute('aria-label',`Remove item ${index+1}`);remove.disabled=state.items.length===1;
    remove.addEventListener('click',()=>{state.items.splice(index,1);renderItems();preview();});cell.append(remove);row.append(cell);$('items').append(row);
  });
}
function render(){for(const field of ['seller','client','project','reference','currency','discount','tax','notes'])$(field).value=state[field];renderItems();preview();}
for(const field of ['seller','client','project','reference','currency','discount','tax','notes'])$(field).addEventListener('input',()=>{state[field]=$(field).value;preview();});
$('add').addEventListener('click',()=>{if(state.items.length===50){status('Maximum 50 items',true);return;}state.items.push({description:'',qty:'1',price:'0'});renderItems();preview();});
$('sample').addEventListener('click',()=>{state={...fresh(),seller:'Sample Studio',client:'Example & Co.',project:'A small business website',reference:'DEMO-001',discount:'10',tax:'20',items:[{description:'Landing page layout',qty:'1',price:'180'},{description:'Contact form',qty:'1',price:'45'},{description:'Browser checks',qty:'2',price:'25'}],notes:'Three pages, one review round.\nDelivery timing and payment terms to be agreed.'};render();status('Synthetic example loaded. Review before sharing.');});
$('save').addEventListener('click',()=>{try{const draft=validateDraft(state);localStorage.setItem(key,JSON.stringify(draft));status('Draft saved in this browser.');}catch(error){status(error.message,true);}});
$('export').addEventListener('click',()=>{try{const draft=validateDraft(state);const url=URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)+'\n'],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='quote-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('JSON draft exported.');}catch(error){status(error.message,true);}});
$('import').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async event=>{const file=event.target.files[0];try{if(!file)return;if(file.size>1024*1024)throw new Error('Draft exceeds 1 MiB');state=validateDraft(JSON.parse(await file.text()));render();status('Draft imported; review before saving.');}catch(error){status(error.message,true);}finally{event.target.value='';}});
$('print').addEventListener('click',()=>{if(preview())window.print();});
try{const saved=localStorage.getItem(key);if(saved)state=validateDraft(JSON.parse(saved));}catch{status('Saved draft could not be read. Start a new draft or import a backup.',true);}
render();
