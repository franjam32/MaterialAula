(()=>{
'use strict';
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function items(){return (state?.data?.catalog?.length?state.data.catalog:[])||[]}
function findMaterial(q){
  const n=norm(q); if(!n) return null;
  const all=items();
  return all.find(x=>norm(x.name)===n)
    || all.find(x=>String(x.aliases||'').split(',').some(a=>norm(a)===n))
    || all.find(x=>norm(x.name).includes(n)||n.includes(norm(x.name))
      ||String(x.aliases||'').split(',').some(a=>norm(a).includes(n)||n.includes(norm(a))))
    || null;
}

/* Colores acordados para la práctica:
   respiratorio azul · circulatorio rojo · pediátrico amarillo · otros verde */
try{
  catMeta.respiratorio.class='blue'; catMeta.respiratorio.dot='🔵';
  catMeta.circulatorio.class='red'; catMeta.circulatorio.dot='🔴';
}catch(e){}

/* Descripción: primero catálogo docente específico; web solo como último recurso. */
lookupDescription = async function(q){
  const local=findMaterial(q);
  if(local?.description) return local.description;
  try{
    const url='https://es.wikipedia.org/w/api.php?'+new URLSearchParams({
      action:'query',generator:'search',gsrsearch:'"'+q+'" medicina',
      gsrlimit:'1',prop:'extracts',exintro:'1',explaintext:'1',exsentences:'2',
      format:'json',origin:'*'
    });
    const r=await fetch(url),j=await r.json(),p=Object.values(j.query?.pages||{})[0];
    const t=(p?.extract||'').slice(0,420);
    const key=norm(q).split(' ')[0];
    return t && norm(t).includes(key) ? t : '';
  }catch(e){ return ''; }
};

/* Imagen: usa el término técnico inglés/específico guardado en catálogo. */
lookupImages = async function(q){
  const status=document.querySelector('#lookupStatus');
  const choices=document.querySelector('#imageChoices');
  if(status) status.textContent='Buscando imágenes específicas en Wikimedia Commons…';
  if(choices) choices.innerHTML='';
  try{
    const local=findMaterial(q);
    const term=local?.image_query || q;
    const searches=[term, term+' medical device', '"'+q+'" medical'];
    let pages=[];
    for(const search of searches){
      const url='https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({
        action:'query',generator:'search',gsrsearch:search,gsrnamespace:'6',
        gsrlimit:'12',prop:'imageinfo',iiprop:'url',iiurlwidth:'500',
        format:'json',origin:'*'
      });
      const r=await fetch(url),j=await r.json();
      pages=Object.values(j.query?.pages||{}).filter(p=>p.imageinfo?.[0]?.thumburl);
      if(pages.length) break;
    }
    pages=pages.slice(0,6);
    if(!pages.length) throw new Error('Sin resultados');
    choices.innerHTML=pages.map((p,i)=>'<button type="button" class="image-choice" data-img="'+esc(p.imageinfo[0].thumburl)+'" title="'+esc(p.title||'')+'"><img src="'+esc(p.imageinfo[0].thumburl)+'" alt="Resultado '+(i+1)+'"></button>').join('');
    document.querySelectorAll('[data-img]').forEach(b=>b.onclick=()=>{
      document.querySelectorAll('[data-img]').forEach(x=>x.classList.remove('selected'));
      b.classList.add('selected');
      document.querySelector('#matImageUrl').value=b.dataset.img;
      document.querySelector('#matImagePath').value='';
      const p=document.querySelector('#photoPreview');
      p.src=b.dataset.img;p.classList.remove('hidden');
    });
    status.textContent='Elige la imagen que corresponda exactamente al material o usa la cámara.';
  }catch(e){
    if(status) status.textContent='No se encontró una imagen suficientemente fiable. Haz una foto o sube un archivo.';
  }
};

/* Si el nombre coincide con el catálogo, propone descripción y categoría sin bloquear la elección del alumno. */
const observer=new MutationObserver(()=>{
  const name=document.querySelector('#matName');
  if(!name || name.dataset.catalogEnhanced) return;
  name.dataset.catalogEnhanced='1';
  let timer;
  name.addEventListener('input',()=>{
    clearTimeout(timer);
    timer=setTimeout(()=>{
      const c=findMaterial(name.value);
      if(!c) return;
      const d=document.querySelector('#matDesc');
      if(d && !d.value.trim()) d.value=c.description||'';
      if(c.category){
        const h=document.querySelector('#matCategory');
        if(h && !h.value){
          h.value=c.category;
          document.querySelectorAll('[data-cat]').forEach(x=>x.classList.toggle('selected',x.dataset.cat===c.category));
        }
      }
    },180);
  });
});
observer.observe(document.documentElement,{subtree:true,childList:true});

/* No mostrar un fonendo ficticio cuando no hay fotografía. */
try{
  const oldCard=materialCard;
  materialCard=async function(m,teacher){
    return (await oldCard(m,teacher)).replace('🩺','📷');
  };
}catch(e){}
})();