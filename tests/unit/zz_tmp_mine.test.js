import { it } from 'vitest';
import * as THREE from 'three';
import { SKINS } from '../../js/game/skins.js';
import { buildWorldBay, buildWorldArch } from '../../js/game/worlds.js';
function tris(o){let t=0;o.traverse(m=>{if(m.isMesh){const g=m.geometry;t+=(g.index?g.index.count:g.attributes.position.count)/3;}});return t;}
it('x',()=>{
  ['Neonatal Cloud Nursery','Pharmacy Pop Factory'].forEach(n=>{
    const s=SKINS.find(k=>k.name===n);
    const out=[];
    for(let k=0;k<4;k++){[-1,1].forEach(side=>{out.push(Math.round(tris(buildWorldBay(s,side,-4*k))));});}
    console.log(n,'bays(-1,1 per k):',out.join(','),'arch',Math.round(tris(buildWorldArch(s,-44))));
  });
});
