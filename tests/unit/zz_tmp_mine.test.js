import { it } from 'vitest';
import * as THREE from 'three';
import { SKINS } from '../../js/game/skins.js';
import { buildWorldBay } from '../../js/game/worlds.js';
it('x',()=>{
  const s=SKINS.find(k=>k.name==='Anatomy Amusement Park');
  const g=buildWorldBay(s,-1,0); g.updateMatrixWorld(true);
  g.children.forEach((c,i)=>{const b=new THREE.Box3().setFromObject(c); if(-b.max.x<4.3 && b.min.y<=2.6 && b.max.y>=0.12 && !(b.min.x<0&&b.max.x>0)) console.log('OFF',i,c.geometry.type,b.min.toArray().map(v=>v.toFixed(2)),b.max.toArray().map(v=>v.toFixed(2)));});
});
