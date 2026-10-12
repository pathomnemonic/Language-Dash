import { it } from 'vitest';
import { SKINS } from '../../js/game/skins.js';
import { buildWorldBay, buildWorldArch } from '../../js/game/worlds.js';
import { buildTrack } from '../../js/game/track.js';
import * as THREE from 'three';
function tris(o){let t=0;o.traverse(m=>{if(m.isMesh){const g=m.geometry;t+=((g.index?g.index.count:g.attributes.position.count)/3)*(m.isInstancedMesh?m.count:1);}});return t;}
it('x',()=>{
  ['Neonatal Cloud Nursery','Pharmacy Pop Factory'].forEach(n=>{
    const s=SKINS.find(k=>k.name===n);
    const out=[];
    for(let k=0;k<4;k++){out.push(Math.round(tris(buildWorldBay(s,-1,-4*k))));}
    console.log('RES',n,'bays per k:',out.join(','),'arch',Math.round(tris(buildWorldArch(s,-44))));
    const root=new THREE.Scene(); const refs=buildTrack(root,s,{quality:'medium'});
    const by={};
    root.children.forEach(c=>{by[c.type+':'+(c.name||'')+':'+c.children.length]=Math.round(tris(c));});
    console.log('RES total',Math.round(tris(root)), JSON.stringify(by));
  });
});
