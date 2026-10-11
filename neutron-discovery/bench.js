import * as THREE_CORE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {gsap} from 'gsap';
/* the scene code below was written against the global THREE namespace; merge the add-ons into one object and expose gsap the same way */
const THREE=Object.assign({},THREE_CORE,{OrbitControls,RoundedBoxGeometry,EffectComposer,RenderPass,UnrealBloomPass});
window.gsap=gsap;
(function(){
var stage=document.getElementById('stage');
var renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setClearColor(0x07080c,1);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.outputEncoding=THREE.sRGBEncoding;
stage.appendChild(renderer.domElement);
var scene=new THREE.Scene();scene.fog=new THREE.Fog(0x07080c,16,34);
var camera=new THREE.PerspectiveCamera(36,1,0.1,100);

/* ---------- procedural textures (brass, wood, dial face) ---------- */
function canvasTex(w,h,draw,repeat){var c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;if(repeat)t.repeat.set(repeat[0],repeat[1]);t.encoding=THREE.sRGBEncoding;return t}
var brassTex=canvasTex(512,512,function(g,w,h){g.fillStyle='#b48f3d';g.fillRect(0,0,w,h);for(var i=0;i<4000;i++){var y=Math.random()*h,l=20+Math.random()*120,a=Math.random()*0.18;g.strokeStyle='rgba(255,230,160,'+a+')';g.beginPath();g.moveTo(Math.random()*w,y);g.lineTo(Math.random()*w+l,y);g.stroke();g.strokeStyle='rgba(60,40,10,'+a+')';g.beginPath();var y2=Math.random()*h;g.moveTo(Math.random()*w,y2);g.lineTo(Math.random()*w+l,y2);g.stroke()}},[2,1]);
var woodTex=canvasTex(1024,512,function(g,w,h){g.fillStyle='#4a3522';g.fillRect(0,0,w,h);for(var i=0;i<90;i++){var y=i*6+Math.random()*4;g.strokeStyle='rgba('+(20+Math.random()*30)+','+(10+Math.random()*20)+',5,'+(0.25+Math.random()*0.35)+')';g.lineWidth=1+Math.random()*2.5;g.beginPath();g.moveTo(0,y);for(var x=0;x<=w;x+=64)g.lineTo(x,y+Math.sin(x*0.01+i)*6+Math.random()*2);g.stroke()}for(var k=0;k<300;k++){g.fillStyle='rgba(255,220,170,'+Math.random()*0.06+')';g.fillRect(Math.random()*w,Math.random()*h,Math.random()*40,1)}},[3,1]);
var dialTex=canvasTex(512,512,function(g,w,h){g.fillStyle='#efe6cf';g.fillRect(0,0,w,h);g.translate(256,330);g.strokeStyle='#2a2320';g.lineWidth=3;g.beginPath();g.arc(0,0,210,Math.PI*1.15,Math.PI*1.85);g.stroke();for(var i=0;i<=20;i++){var a=Math.PI*1.15+i*(Math.PI*0.7/20);var r1=i%5===0?180:195;g.lineWidth=i%5===0?3:1.5;g.beginPath();g.moveTo(Math.cos(a)*r1,Math.sin(a)*r1);g.lineTo(Math.cos(a)*210,Math.sin(a)*210);g.stroke();if(i%5===0){g.fillStyle='#2a2320';g.font='500 26px serif';g.textAlign='center';g.fillText(String(i/5*25),Math.cos(a)*155,Math.sin(a)*155+9)}}g.font='italic 22px serif';g.fillText('galvanometer · μA',0,-40);g.beginPath();g.arc(0,0,8,0,Math.PI*2);g.fill()});
var leadTex=canvasTex(256,256,function(g,w,h){g.fillStyle='#4a4d55';g.fillRect(0,0,w,h);for(var i=0;i<2500;i++){g.fillStyle='rgba('+(Math.random()>0.5?'255,255,255':'0,0,0')+','+Math.random()*0.12+')';g.fillRect(Math.random()*w,Math.random()*h,Math.random()*6,Math.random()*2)}},[2,2]);

/* ---------- lights ---------- */
scene.add(new THREE.HemisphereLight(0x9aa3c8,0x1c1610,0.5));
var key=new THREE.DirectionalLight(0xfff0d8,1.3);key.position.set(4,9,6);key.castShadow=true;
key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-11;key.shadow.camera.right=11;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;key.shadow.bias=-0.0005;scene.add(key);
var rim=new THREE.DirectionalLight(0x8090ff,0.5);rim.position.set(-7,4,-7);scene.add(rim);
var deskLamp=new THREE.SpotLight(0xffd9a8,1.6,20,0.6,0.5,1);deskLamp.position.set(2,7,2);deskLamp.target.position.set(0,0,0);scene.add(deskLamp,deskLamp.target);

/* ---------- materials ---------- */
/* environment: a dim room with a few soft light panels, baked to a PMREM so brass, steel and glass have something to reflect */
(function(){var pm=new THREE.PMREMGenerator(renderer);var env=new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(20,20,20),new THREE.MeshBasicMaterial({color:0x1a1c24,side:THREE.BackSide})));
  function panel(w,h,x,y,z,c,i){var m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(i),side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);env.add(m)}
  panel(6,3,0,9,0,0xfff0d8,3.5);panel(3,6,-9,2,-4,0x8090ff,2);panel(4,2,6,4,8,0xffd9a8,2.5);panel(10,1,0,-2,9,0x303848,1.5);
  scene.environment=pm.fromScene(env,0.04).texture;pm.dispose()})();
var wood=new THREE.MeshStandardMaterial({map:woodTex,bumpMap:woodTex,bumpScale:0.015,roughness:0.75});
var lead=new THREE.MeshStandardMaterial({map:leadTex,bumpMap:leadTex,bumpScale:0.01,color:0xc9ccd4,roughness:0.55,metalness:0.75});
var brass=new THREE.MeshStandardMaterial({map:brassTex,bumpMap:brassTex,bumpScale:0.004,roughness:0.38,metalness:0.92});
var brassDark=new THREE.MeshStandardMaterial({map:brassTex,bumpMap:brassTex,bumpScale:0.004,color:0x8a6a2a,roughness:0.42,metalness:0.9});
var steel=new THREE.MeshStandardMaterial({color:0x9aa0a8,roughness:0.28,metalness:0.95});
var copper=new THREE.MeshStandardMaterial({color:0xb86b3c,roughness:0.35,metalness:0.95});
var bakelite=new THREE.MeshStandardMaterial({color:0x2a1b12,roughness:0.4});
var cloth=new THREE.MeshStandardMaterial({color:0x14161b,roughness:1});
var rubber=new THREE.MeshStandardMaterial({color:0x1a1a1c,roughness:0.9});
var paper=new THREE.MeshStandardMaterial({color:0xe9e0c7,roughness:0.95});
var glass=new THREE.MeshPhysicalMaterial({color:0xd6ecff,roughness:0.04,metalness:0,transmission:0.95,transparent:true,opacity:0.35,side:THREE.DoubleSide});

function mesh(g,m){var o=new THREE.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;return o}
function add(m,x,y,z){m.position.set(x,y,z);scene.add(m);return m}
function lathe(points,mat,segs){return mesh(new THREE.LatheGeometry(points.map(function(p){return new THREE.Vector2(p[0],p[1])}),segs||64),mat)}
function knurl(r,h,mat,n){var g=new THREE.Group();g.add(mesh(new THREE.CylinderGeometry(r,r,h,48),mat));for(var i=0;i<(n||24);i++){var rib=mesh(new THREE.BoxGeometry(0.03,h*1.02,0.05),mat);var a=i/(n||24)*Math.PI*2;rib.position.set(Math.cos(a)*r,0,Math.sin(a)*r);rib.rotation.y=-a;g.add(rib)}return g}
/* rounded box (falls back to a plain box if the helper script did not load) */
function rbox(w,h,d,r,mat){return mesh(THREE.RoundedBoxGeometry?new THREE.RoundedBoxGeometry(w,h,d,3,r):new THREE.BoxGeometry(w,h,d),mat)}
/* ring of hex bolt heads in the XZ plane at radius r, facing +Y */
function boltRing(parent,r,n,y,mat,size){for(var i=0;i<n;i++){var a=i/n*Math.PI*2;var b=mesh(new THREE.CylinderGeometry(size||0.04,size||0.04,0.035,6),mat||steel);b.position.set(Math.cos(a)*r,y,Math.sin(a)*r);parent.add(b)}}
/* engraved brass nameplate */
function plate(text,w,h,px){var t=canvasTex(512,128,function(g,cw,ch){g.fillStyle='#c9a44a';g.fillRect(0,0,cw,ch);g.strokeStyle='#3a2a10';g.lineWidth=4;g.strokeRect(10,10,cw-20,ch-20);g.fillStyle='#2a1e08';g.font='500 '+(px||44)+'px serif';g.textAlign='center';g.textBaseline='middle';var lines=text.split('\n');lines.forEach(function(l,i){g.fillText(l,cw/2,ch/2+(i-(lines.length-1)/2)*(px||44)*1.1)})});
  var g=new THREE.Group();g.add(mesh(new THREE.BoxGeometry(w,h,0.02),brass));var face=new THREE.Mesh(new THREE.PlaneGeometry(w*0.98,h*0.9),new THREE.MeshStandardMaterial({map:t,roughness:0.35,metalness:0.6}));face.position.z=0.011;g.add(face);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(c){var s=mesh(new THREE.CylinderGeometry(0.018,0.018,0.01,12),steel);s.rotation.x=Math.PI/2;s.position.set(c[0]*(w/2-0.04),c[1]*(h/2-0.04),0.015);g.add(s)});return g}
/* a cable along a smooth curve through the given points */
function cable(pts,r,mat){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(function(p){return new THREE.Vector3(p[0],p[1],p[2])})),48,r||0.04,10,false),mat||cloth)}
/* simple hex nut + stud */
function thumbscrew(parent,x,y,z,axis,mat){var g=new THREE.Group();var head=knurl(0.07,0.05,mat||brassDark,12);g.add(head);var stem=mesh(new THREE.CylinderGeometry(0.02,0.02,0.18,10),steel);stem.position.y=-0.1;g.add(stem);g.position.set(x,y,z);if(axis==='x')g.rotation.z=-Math.PI/2;if(axis==='z')g.rotation.x=Math.PI/2;parent.add(g);return g}

/* ---------- room ---------- */
add(mesh(new THREE.BoxGeometry(18,0.32,6.5),wood),0,-0.75,0);
add(mesh(new THREE.BoxGeometry(18.2,0.08,6.7),wood),0,-0.55,0);
[[-8,-2.8],[-8,2.8],[8,-2.8],[8,2.8]].forEach(function(p){add(mesh(new THREE.BoxGeometry(0.32,2.6,0.32),wood),p[0],-2.2,p[1])});
/* apron, drawers with brass pulls, stretcher between the legs */
add(mesh(new THREE.BoxGeometry(18,0.9,0.1),wood),0,-1.4,3.2);add(mesh(new THREE.BoxGeometry(18,0.9,0.1),wood),0,-1.4,-3.2);
[-5.5,-1.8,1.8,5.5].forEach(function(x){var d=rbox(3.0,0.62,0.06,0.02,wood);d.position.set(x,-1.4,3.27);scene.add(d);var pull=mesh(new THREE.TorusGeometry(0.11,0.02,10,32,Math.PI),brass);pull.position.set(x,-1.42,3.33);pull.rotation.z=Math.PI;scene.add(pull);var k=mesh(new THREE.BoxGeometry(0.3,0.06,0.02),brass);k.position.set(x,-1.32,3.31);scene.add(k)});
add(mesh(new THREE.BoxGeometry(16,0.12,0.12),wood),0,-3.1,-2.8);add(mesh(new THREE.BoxGeometry(16,0.12,0.12),wood),0,-3.1,2.8);
var floorTex=woodTex.clone();floorTex.needsUpdate=true;floorTex.repeat.set(1,24);floorTex.rotation=Math.PI/2;
var floor=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.MeshStandardMaterial({map:floorTex,color:0x3a3430,roughness:0.9}));floor.rotation.x=-Math.PI/2;floor.position.y=-3.5;floor.receiveShadow=true;scene.add(floor);
var wallTex=canvasTex(512,512,function(g,w,h){g.fillStyle='#1e2028';g.fillRect(0,0,w,h);g.strokeStyle='rgba(0,0,0,.45)';g.lineWidth=3;for(var y=0;y<h;y+=128){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();for(var x=(y/128%2)*128;x<w;x+=256){g.beginPath();g.moveTo(x,y);g.lineTo(x,y+128);g.stroke()}}for(var i=0;i<1500;i++){g.fillStyle='rgba(255,255,255,'+Math.random()*0.04+')';g.fillRect(Math.random()*w,Math.random()*h,3,3)}},[16,6]);
var wall=new THREE.Mesh(new THREE.PlaneGeometry(80,30),new THREE.MeshStandardMaterial({map:wallTex,roughness:1}));wall.position.set(0,8,-9);wall.receiveShadow=true;scene.add(wall);
/* optical rail: graduated steel bar on feet, with riders */
var railTex=canvasTex(2048,64,function(g,w,h){g.fillStyle='#9aa0a8';g.fillRect(0,0,w,h);g.fillStyle='#262a30';for(var i=0;i<=130;i++){var x=14+i*15.5;g.fillRect(x,h-(i%10===0?26:i%5===0?18:10),2,30)}});
add(mesh(new THREE.BoxGeometry(13,0.14,0.5),new THREE.MeshStandardMaterial({map:railTex,roughness:0.3,metalness:0.95})),0,-0.44,0);
[-6,0,6].forEach(function(x){add(mesh(new THREE.BoxGeometry(0.5,0.08,0.9),steel),x,-0.5,0)});
function rider(x){var g=new THREE.Group();g.add(mesh(new THREE.BoxGeometry(0.6,0.16,0.62),steel));var post=mesh(new THREE.CylinderGeometry(0.05,0.05,0.95,16),steel);post.position.y=0.5;g.add(post);var screw=knurl(0.09,0.06,brassDark,12);screw.position.set(0.3,0.06,0);screw.rotation.z=Math.PI/2;g.add(screw);add(g,x,-0.29,0);return g}

/* ---------- 1. polonium source in a lead collimator ---------- */
var coll=lathe([[0,0],[0.75,0],[0.75,0.5],[0.85,0.52],[0.85,0.7],[0.75,0.72],[0.75,1.3],[0.85,1.32],[0.85,1.5],[0.75,1.52],[0.75,1.8],[0,1.8]],lead);
coll.rotation.z=-Math.PI/2;add(coll,-6.5,0.5,0);
[[-5.9,0.6],[-5.1,0.6]].forEach(function(f){var ring=new THREE.Group();ring.position.set(f[0],0.5,0);ring.rotation.z=Math.PI/2;boltRing(ring,0.8,8,0.085,steel,0.035);scene.add(ring)});
add(mesh(new THREE.CylinderGeometry(0.14,0.14,0.12,32),new THREE.MeshStandardMaterial({color:0x020305})),-4.7,0.5,0).rotation.z=Math.PI/2;
var srcCap=knurl(0.3,0.12,brass,24);srcCap.rotation.z=Math.PI/2;add(srcCap,-6.55,0.5,0);
add(rbox(1.9,0.5,1.3,0.02,lead),-5.6,-0.2,0);
var srcPlate=plate('Po · 210\n5.3 MeV α',0.7,0.3,34);srcPlate.position.set(-5.6,-0.2,0.66);scene.add(srcPlate);
var po=new THREE.Mesh(new THREE.SphereGeometry(0.11,24,24),new THREE.MeshBasicMaterial({color:new THREE.Color(3.5,2.2,0.6)}));po.position.set(-4.66,0.5,0);scene.add(po);
var poLight=new THREE.PointLight(0xf0a63a,1.4,4.5);poLight.position.copy(po.position);scene.add(poLight);

/* ---------- 2. beryllium disc in a ring clamp ---------- */
rider(-3.2);
var be=add(mesh(new THREE.CylinderGeometry(0.55,0.55,0.08,64),new THREE.MeshStandardMaterial({color:0xb4bcc4,roughness:0.22,metalness:0.98})),-3.2,0.65,0);be.rotation.z=Math.PI/2;
add(mesh(new THREE.TorusGeometry(0.6,0.045,16,64),brassDark),-3.2,0.65,0).rotation.y=Math.PI/2;
/* three-jaw clamp holding the disc, each jaw with its own thumbscrew */
[90,210,330].forEach(function(deg){var a=deg*Math.PI/180;var jaw=mesh(new THREE.BoxGeometry(0.1,0.16,0.14),brassDark);jaw.position.set(-3.2,0.65+Math.cos(a)*0.6,Math.sin(a)*0.6);jaw.rotation.x=-a;scene.add(jaw);
  var ts=knurl(0.05,0.04,brassDark,10);ts.position.set(-3.2,0.65+Math.cos(a)*0.72,Math.sin(a)*0.72);ts.rotation.x=-a;scene.add(ts)});
var bePlate=plate('Be',0.26,0.18,60);bePlate.position.set(-3.2,-0.14,0.33);scene.add(bePlate);

/* ---------- 3. swappable target ---------- */
rider(-0.4);
var targetGroup=new THREE.Group();scene.add(targetGroup);
var targets={
  lead:function(){var g=new THREE.Group();var stamp=canvasTex(256,64,function(c,w,h){c.fillStyle='rgba(0,0,0,0)';c.clearRect(0,0,w,h);c.fillStyle='rgba(20,22,26,.8)';c.font='500 36px serif';c.textAlign='center';c.fillText('Pb  ·  CAVENDISH',w/2,46)});
    for(var i=0;i<4;i++){var brick=rbox(0.7,0.46,1.9,0.03,lead);brick.position.set((i%2?0.03:-0.03),-0.72+i*0.48,0);brick.rotation.y=(i%2?0.02:-0.02);g.add(brick);
      var s=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.22),new THREE.MeshBasicMaterial({map:stamp,transparent:true}));s.position.set(brick.position.x+0.36,brick.position.y,0);s.rotation.y=Math.PI/2;g.add(s)}return g},
  wax:function(){var g=new THREE.Group();g.add(rbox(0.5,1.5,1.5,0.04,new THREE.MeshPhysicalMaterial({color:0xf4e8c6,roughness:0.6,transmission:0.35,transparent:true,opacity:0.97})));
    var band=mesh(new THREE.BoxGeometry(0.54,0.5,1.54),new THREE.MeshStandardMaterial({map:canvasTex(256,128,function(c,w,h){c.fillStyle='#d8c9a3';c.fillRect(0,0,w,h);c.fillStyle='#3a2a14';c.font='500 30px serif';c.textAlign='center';c.fillText('PARAFFIN WAX',w/2,56);c.font='22px serif';c.fillText('C₂₅H₅₂  ·  Price\'s',w/2,92)}),roughness:0.95}));band.position.y=0.1;g.add(band);
    var tray=rbox(0.78,0.08,1.78,0.01,brass);tray.position.y=-0.78;g.add(tray);[-0.8,0.8].forEach(function(z){var lip=mesh(new THREE.BoxGeometry(0.78,0.16,0.04),brass);lip.position.set(0,-0.7,z);g.add(lip)});return g},
  n:function(){return new THREE.Group()}  /* nitrogen goes INTO the ionisation chamber, so the target slot is empty */
};
function setTargetMesh(k){while(targetGroup.children.length)targetGroup.remove(targetGroup.children[0]);var m=targets[k]();m.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});m.position.set(-0.4,0.55,0);m.scale.setScalar(0.01);targetGroup.add(m);if(window.gsap)gsap.to(m.scale,{x:1,y:1,z:1,duration:0.6,ease:'back.out(1.6)'});else m.scale.setScalar(1)}

/* ---------- 3b. aluminium absorber rack: foils of known air-equivalent slid into the beam ---------- */
var alu=new THREE.MeshStandardMaterial({color:0xd9dde2,roughness:0.35,metalness:0.9,side:THREE.DoubleSide});
var rack=new THREE.Group();add(rack,1.2,0.55,0);
var rb=mesh(new THREE.BoxGeometry(0.9,0.08,1.3),brassDark);rb.position.y=-0.72;rack.add(rb);
[-0.6,0.6].forEach(function(z){var p=mesh(new THREE.BoxGeometry(0.9,1.45,0.06),brassDark);p.position.set(0,0,z);rack.add(p)});
var foils=[];for(var i=0;i<6;i++){var f=mesh(new THREE.BoxGeometry(0.012,1.3,1.15),alu);f.position.x=-0.3+i*0.12;f.visible=i<2;rack.add(f);foils.push(f)}
var foilsIn=2;
window.setFoils=function(n){foilsIn=Math.max(0,Math.min(6,n));foils.forEach(function(f,i){f.visible=i<foilsIn});document.getElementById('foilN').textContent=foilsIn;
  var cm=foilsIn*8,rate=Math.max(0,1-cm/40);document.getElementById('foilCm').textContent=cm;document.getElementById('foilRate').textContent=Math.round(rate*100)+'%';
  modes.wax.frac=rate;restartTimer()};
window.foilCount=function(){return foilsIn};

/* ---------- 3c. Wilson cloud chamber, behind the rail: glass drum, piston, camera ---------- */
var cc=new THREE.Group();add(cc,-1.6,0.1,-2.6);
cc.add(mesh(new THREE.CylinderGeometry(1.0,1.0,0.7,64,1,true),glass));
var ccTop=mesh(new THREE.CylinderGeometry(1.0,1.0,0.03,64),glass);ccTop.position.y=0.36;cc.add(ccTop);
var ccFloor=mesh(new THREE.CylinderGeometry(0.98,0.98,0.04,64),new THREE.MeshStandardMaterial({color:0x0a0b0e,roughness:0.9}));ccFloor.position.y=-0.33;cc.add(ccFloor);
var ccBase=knurl(1.08,0.3,brass,48);ccBase.position.y=-0.5;cc.add(ccBase);
var piston=mesh(new THREE.CylinderGeometry(0.35,0.35,0.6,32),brassDark);piston.position.y=-0.95;cc.add(piston);
var camStand=mesh(new THREE.CylinderGeometry(0.04,0.04,1.4,12),steel);camStand.position.set(1.3,0.5,0);cc.add(camStand);
var cam=mesh(new THREE.BoxGeometry(0.5,0.4,0.5),bakelite);cam.position.set(0.3,1.35,0);cc.add(cam);
var lens=mesh(new THREE.CylinderGeometry(0.12,0.14,0.25,24),brass);lens.position.set(0.3,1.05,0);cc.add(lens);
var camArm=mesh(new THREE.BoxGeometry(1.1,0.05,0.05),steel);camArm.position.set(0.8,1.2,0);cc.add(camArm);
/* camera bellows, piston rod and release lever, flash lamp in a parabolic reflector */
for(var i=0;i<4;i++){var pleat=mesh(new THREE.BoxGeometry(0.36-i*0.03,0.04,0.36-i*0.03),cloth);pleat.position.set(0.3,1.14-i*0.03,0);cc.add(pleat)}
var pRod=mesh(new THREE.CylinderGeometry(0.04,0.04,0.7,12),steel);pRod.position.set(0,-1.5,0);cc.add(pRod);
var pLever=mesh(new THREE.BoxGeometry(1.2,0.05,0.08),steel);pLever.position.set(0.6,-1.75,0);pLever.rotation.z=0.25;cc.add(pLever);
var pKnob=mesh(new THREE.SphereGeometry(0.08,16,16),bakelite);pKnob.position.set(1.18,-1.6,0);cc.add(pKnob);
var pPivot=mesh(new THREE.BoxGeometry(0.1,0.5,0.3),steel);pPivot.position.set(0.3,-1.95,0);cc.add(pPivot);
var flash=new THREE.Group();flash.position.set(-1.6,0.3,0);flash.rotation.y=-Math.PI/2;cc.add(flash);
var refl=lathe([[0,0],[0.1,0.02],[0.25,0.1],[0.36,0.25],[0.42,0.45],[0.44,0.6],[0.4,0.62],[0.38,0.47],[0.33,0.27],[0.22,0.12],[0.08,0.05],[0,0.04]],steel,48);refl.rotation.x=Math.PI/2;flash.add(refl);
var flBulb=new THREE.Mesh(new THREE.SphereGeometry(0.1,16,16),new THREE.MeshBasicMaterial({color:new THREE.Color(2.5,2.6,3)}));flBulb.position.z=0.3;flash.add(flBulb);
var flPost=mesh(new THREE.CylinderGeometry(0.035,0.035,0.9,12),steel);flPost.position.set(0,-0.45,0.2);flash.add(flPost);var flFoot=mesh(new THREE.CylinderGeometry(0.22,0.24,0.06,24),steel);flFoot.position.set(0,-0.9,0.2);flash.add(flFoot);
var trackPool=[];for(var i=0;i<7;i++){var t=new THREE.Mesh(new THREE.BoxGeometry(1,0.012,0.012),new THREE.MeshBasicMaterial({color:new THREE.Color(2.5,2.6,3),transparent:true,opacity:0}));t.visible=false;cc.add(t);trackPool.push({m:t,life:0})}
function cloudTracks(){
  if(!active('cloud')){trackPool.forEach(function(tr){tr.life=0;tr.m.visible=false});return}
  if(frame%45===0){for(var i=0;i<trackPool.length;i++)if(trackPool[i].life<=0){var tr=trackPool[i];tr.life=1;var long=Math.random()<0.5;var len=long?0.5+Math.random()*0.9:0.08+Math.random()*0.12;
    tr.m.scale.set(len,long?1:2.5,long?1:2.5);tr.m.position.set((Math.random()-0.5)*1.2,-0.3+Math.random()*0.5,(Math.random()-0.5)*1.2);tr.m.rotation.y=Math.random()*Math.PI;tr.m.visible=true;break}}
  trackPool.forEach(function(tr){if(tr.life<=0)return;tr.life-=0.012;tr.m.material.opacity=Math.min(1,tr.life*3);if(tr.life<=0)tr.m.visible=false});
}

/* ---------- 4. ionisation chamber: lathe body with flanges, paper window, insulator stem ---------- */
var chamberMat=brass.clone();chamberMat.transparent=true;chamberMat.side=THREE.DoubleSide;
var chamber=lathe([[0,0],[0.5,0],[0.55,0.02],[0.95,0.04],[0.95,0.14],[0.85,0.16],[0.85,2.2],[0.95,2.22],[0.95,2.36],[0.85,2.4],[0.3,2.4],[0.3,2.55],[0.12,2.55],[0.12,3.1],[0,3.1]],chamberMat);
chamber.rotation.z=-Math.PI/2;add(chamber,2.4,0.55,0);
/* inside: central wire electrode on insulators, and a faint gas volume (seen in cutaway) */
var wireMat=new THREE.MeshStandardMaterial({color:0xffe9b0,emissive:0x6a4a10,emissiveIntensity:0.5,metalness:1,roughness:0.2});
var wire=add(mesh(new THREE.CylinderGeometry(0.025,0.025,2.5,12),wireMat),3.65,0.55,0);wire.rotation.z=Math.PI/2;
[2.55,4.75].forEach(function(x){var s=mesh(new THREE.CylinderGeometry(0.06,0.09,0.25,16),bakelite);s.rotation.z=Math.PI/2;add(s,x,0.55,0)});
var gasMat=new THREE.MeshBasicMaterial({color:0x8fc8ff,transparent:true,opacity:0,depthWrite:false});
var gas=add(new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.8,2.2,48),gasMat),3.6,0.55,0);gas.rotation.z=Math.PI/2;
/* nitrogen fill for the chamber: a valve on top, a hose to a small N₂ bottle behind the bench rail; visible only in nitrogen mode */
var n2=new THREE.Group();scene.add(n2);n2.visible=false;
var n2Valve=mesh(new THREE.CylinderGeometry(0.06,0.06,0.5,16),brass);n2Valve.position.set(3.6,1.55,0);n2.add(n2Valve);
var n2Wheel=mesh(new THREE.TorusGeometry(0.16,0.03,10,32),brass);n2Wheel.position.set(3.6,1.8,0);n2Wheel.rotation.x=Math.PI/2;n2.add(n2Wheel);
var n2Bottle=mesh(new THREE.CylinderGeometry(0.22,0.22,1.0,32),new THREE.MeshStandardMaterial({color:0x3a3f47,roughness:0.5,metalness:0.6}));n2Bottle.position.set(3.6,0.0,-1.7);n2.add(n2Bottle);
var n2Dome=mesh(new THREE.SphereGeometry(0.22,32,16,0,Math.PI*2,0,Math.PI/2),n2Bottle.material);n2Dome.position.set(3.6,0.5,-1.7);n2.add(n2Dome);
var n2Tap=mesh(new THREE.CylinderGeometry(0.05,0.05,0.25,12),brass);n2Tap.position.set(3.6,0.82,-1.7);n2.add(n2Tap);
var n2Plate=plate('N₂',0.26,0.2,70);n2Plate.position.set(3.6,0.05,-1.47);n2.add(n2Plate);
n2.add(cable([[3.6,0.95,-1.7],[3.62,1.5,-1.3],[3.6,1.9,-0.6],[3.6,1.78,0]],0.035,rubber));
var cutaway=false;
window.setCutaway=function(on){cutaway=on;document.getElementById('b-cut').classList.toggle('on',on);
  restartTimer();
  var o=on?0.14:1,g=on?(mode==="n"?0.16:0.08):0;
  if(window.gsap){gsap.to(chamberMat,{opacity:o,duration:0.8});gsap.to(gasMat,{opacity:g,duration:0.8})}else{chamberMat.opacity=o;gasMat.opacity=g}
  chamberMat.depthWrite=!on;wireMat.emissiveIntensity=on?1.6:0.5};
add(mesh(new THREE.CylinderGeometry(0.46,0.46,0.02,48),new THREE.MeshStandardMaterial({color:0xe2d9c0,roughness:0.95,side:THREE.DoubleSide})),2.4,0.55,0).rotation.z=Math.PI/2;
var ins=lathe([[0,0],[0.18,0],[0.18,0.3],[0.22,0.32],[0.22,0.42],[0.18,0.44],[0.18,0.6],[0,0.6]],bakelite);ins.rotation.z=-Math.PI/2;add(ins,4.8,0.55,0);
/* bolted flanges, a V-block cradle with brass straps, and a nameplate */
[2.5,4.75].forEach(function(x){var ring=new THREE.Group();ring.position.set(x,0.55,0);ring.rotation.z=Math.PI/2;boltRing(ring,0.9,12,0.02,steel,0.035);scene.add(ring)});
add(rbox(1.6,0.45,1.3,0.02,wood),3.6,-0.2,0);
[2.9,4.3].forEach(function(x){var strap=mesh(new THREE.TorusGeometry(0.88,0.03,8,48,Math.PI),brass);strap.position.set(x,0.55,0);strap.rotation.y=Math.PI/2;scene.add(strap);
  [-1,1].forEach(function(s){var wn=knurl(0.06,0.05,brassDark,10);wn.position.set(x,0.55,s*0.9);wn.rotation.x=Math.PI/2;scene.add(wn)})});
var chPlate=plate('IONISATION\nCHAMBER',0.9,0.3,34);chPlate.position.set(3.6,-0.2,0.66);scene.add(chPlate);
/* high-tension battery: a wooden box of dry cells, wired to the central wire through the insulator */
var ht=new THREE.Group();add(ht,4.3,-0.26,1.55);
ht.add(rbox(1.3,0.5,0.7,0.02,wood));
for(var i=0;i<5;i++){var cell=mesh(new THREE.CylinderGeometry(0.09,0.09,0.3,20),new THREE.MeshStandardMaterial({color:0x1c1a18,roughness:0.6}));cell.position.set(-0.5+i*0.25,0.3,0);ht.add(cell);
  var cap=mesh(new THREE.CylinderGeometry(0.03,0.03,0.08,10),brass);cap.position.set(-0.5+i*0.25,0.48,0);ht.add(cap);
  if(i<4){var link=mesh(new THREE.BoxGeometry(0.25,0.015,0.03),copper);link.position.set(-0.375+i*0.25,0.5,0);ht.add(link)}}
var htPlate=plate('H.T.  600 V',0.6,0.18,40);htPlate.position.set(0,0,0.36);ht.add(htPlate);
scene.add(cable([[5.1,0.55,0],[5.3,0.45,0.4],[5.2,0.3,1.0],[4.8,0.3,1.4],[4.3,0.3,1.55]],0.03,cloth));
var curve=new THREE.CatmullRomCurve3([new THREE.Vector3(5.45,0.55,0),new THREE.Vector3(6.0,0.3,0.7),new THREE.Vector3(6.3,-0.3,1.5),new THREE.Vector3(6.4,-0.3,2.0)]);
scene.add(mesh(new THREE.TubeGeometry(curve,40,0.045,10,false),cloth));

/* ---------- 5. valve amplifier with galvanometer ---------- */
var amp=new THREE.Group();add(amp,6.7,0.0,2.2);
amp.add(mesh(new THREE.BoxGeometry(2.0,1.2,1.2),wood));
var panel=mesh(new THREE.BoxGeometry(1.9,1.1,0.05),bakelite);panel.position.z=0.62;amp.add(panel);
var dial=mesh(new THREE.CylinderGeometry(0.42,0.42,0.06,64),new THREE.MeshStandardMaterial({map:dialTex,roughness:0.6}));dial.rotation.x=Math.PI/2;dial.rotation.y=0;dial.position.set(0,0.2,0.68);amp.add(dial);
var bezel=mesh(new THREE.TorusGeometry(0.43,0.035,12,64),brass);bezel.position.set(0,0.2,0.71);amp.add(bezel);
var needle=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.36,0.01),new THREE.MeshStandardMaterial({color:0x111}));needle.position.y=0.18;
var needlePivot=new THREE.Group();needlePivot.position.set(0,0.08,0.73);needlePivot.add(needle);amp.add(needlePivot);
[-0.7,0.7].forEach(function(x){var k=knurl(0.12,0.12,bakelite,18);k.position.set(x,-0.25,0.68);k.rotation.x=Math.PI/2;amp.add(k);var pointer=mesh(new THREE.BoxGeometry(0.02,0.1,0.02),paper);pointer.position.set(x,-0.17,0.75);amp.add(pointer)});
var dialGlass=mesh(new THREE.CylinderGeometry(0.42,0.42,0.01,64),glass);dialGlass.rotation.x=Math.PI/2;dialGlass.position.set(0,0.2,0.73);amp.add(dialGlass);
[[-0.9,0.5],[0.9,0.5],[-0.9,-0.5],[0.9,-0.5]].forEach(function(c){var s=mesh(new THREE.CylinderGeometry(0.03,0.03,0.02,12),steel);s.rotation.x=Math.PI/2;s.position.set(c[0],c[1],0.65);amp.add(s)});
var ampPlate=plate('WYNN-WILLIAMS\nLINEAR AMPLIFIER',1.0,0.26,30);ampPlate.position.set(-0.4,-0.42,0.66);amp.add(ampPlate);
[0.25,0.4,0.55].forEach(function(x){var term=mesh(new THREE.CylinderGeometry(0.035,0.035,0.08,12),brass);term.rotation.x=Math.PI/2;term.position.set(x,-0.42,0.66);amp.add(term);var nut=knurl(0.05,0.03,bakelite,8);nut.rotation.x=Math.PI/2;nut.position.set(x,-0.42,0.7);amp.add(nut)});
/* four radio valves: glass envelope over a dark anode cylinder, grid helix and glowing filament */
var anodeMat=new THREE.MeshStandardMaterial({color:0x3a3d44,roughness:0.5,metalness:0.8});
for(var i=0;i<4;i++){var vx=-0.72+i*0.48,vz=i%2?-0.35:-0.05;var bulb=mesh(new THREE.CylinderGeometry(0.14,0.14,0.5,32),glass);bulb.position.set(vx,0.9,vz);amp.add(bulb);
  var cap=mesh(new THREE.SphereGeometry(0.14,32,16,0,Math.PI*2,0,Math.PI/2),glass);cap.position.set(vx,1.15,vz);amp.add(cap);
  var tipOff=mesh(new THREE.CylinderGeometry(0.02,0.02,0.06,8),glass);tipOff.position.set(vx,1.31,vz);amp.add(tipOff);
  var base=mesh(new THREE.CylinderGeometry(0.16,0.16,0.08,24),bakelite);base.position.set(vx,0.62,vz);amp.add(base);
  var anode=mesh(new THREE.CylinderGeometry(0.07,0.07,0.3,16,1,true),anodeMat);anode.position.set(vx,0.95,vz);amp.add(anode);
  var grid=mesh(new THREE.TorusGeometry(0.04,0.004,6,24),steel);for(var k=0;k<5;k++){var gr=grid.clone();gr.rotation.x=Math.PI/2;gr.position.set(vx,0.83+k*0.06,vz);amp.add(gr)}
  var fil=new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01,0.3,6),new THREE.MeshBasicMaterial({color:new THREE.Color(4,1.6,0.5)}));fil.position.set(vx,0.95,vz);amp.add(fil);
  if(i%2===0){var fl=new THREE.PointLight(0xff8a3a,0.5,2.5);fl.position.set(vx+0.24,1.0,-0.2);amp.add(fl)}}
/* screened lead from the amplifier back to the oscillograph */
scene.add(cable([[6.7,0.6,1.6],[6.9,0.7,0.5],[6.6,0.6,-0.8],[6.2,0.45,-1.7],[5.9,0.45,-1.95]],0.035,cloth));
var lampMat=new THREE.MeshBasicMaterial({color:0x200804});
var lamp=new THREE.Mesh(new THREE.SphereGeometry(0.08,16,16),lampMat);lamp.position.set(0.75,0.3,0.68);amp.add(lamp);

/* ---------- 6. gold-leaf electrometer: two leaves spread by charge, collapsing as radiation ionises the air ---------- */
var gold=new THREE.MeshStandardMaterial({color:0xffd35a,metalness:1,roughness:0.25,side:THREE.DoubleSide,emissive:0x3a2a00,emissiveIntensity:0.3});
var em=new THREE.Group();add(em,-7.0,0.0,-2.6);
var emBase=mesh(new THREE.CylinderGeometry(0.55,0.6,0.25,48),wood);emBase.position.y=-0.42;em.add(emBase);
em.add(mesh(new THREE.CylinderGeometry(0.5,0.5,1.3,48,1,true),glass));
var emCap=knurl(0.52,0.12,brass,36);emCap.position.y=0.7;em.add(emCap);
var emRod=mesh(new THREE.CylinderGeometry(0.03,0.03,1.5,12),brass);emRod.position.y=0.55;em.add(emRod);
var emBall=mesh(new THREE.SphereGeometry(0.12,24,24),brass);emBall.position.y=1.3;em.add(emBall);
var leafL=new THREE.Group(),leafR=new THREE.Group();leafL.position.y=0.35;leafR.position.y=0.35;em.add(leafL,leafR);
var lgeo=new THREE.BoxGeometry(0.01,0.55,0.12);
var l1=new THREE.Mesh(lgeo,gold);l1.position.y=-0.275;leafL.add(l1);var l2=new THREE.Mesh(lgeo,gold);l2.position.y=-0.275;leafR.add(l2);
var emScale=new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.4),new THREE.MeshBasicMaterial({map:canvasTex(256,200,function(g,w,h){g.fillStyle='#f3ead3';g.fillRect(0,0,w,h);g.strokeStyle='#2a2320';g.lineWidth=2;for(var i=0;i<=10;i++){var x=20+i*21.6;g.beginPath();g.moveTo(x,170);g.lineTo(x,i%5===0?140:155);g.stroke()}g.fillStyle='#2a2320';g.font='22px serif';g.textAlign='center';g.fillText('0',20,128);g.fillText('5',128,128);g.fillText('10',236,128);g.font='italic 18px serif';g.fillText('divisions',128,60)}),transparent:true,opacity:0.9}));emScale.position.set(0,0.1,-0.47);em.add(emScale);
var emSample=new THREE.Mesh(new THREE.SphereGeometry(0.06,16,16),new THREE.MeshBasicMaterial({color:new THREE.Color(3,2,0.6)}));emSample.position.set(0.25,-0.26,0.1);em.add(emSample);
var emTray=mesh(new THREE.CylinderGeometry(0.12,0.12,0.03,24),brassDark);emTray.position.set(0.25,-0.29,0.1);em.add(emTray);
/* brass window frame on the front, insulating amber plug in the cap, and a reading microscope aimed at the leaves */
var emFrame=mesh(new THREE.TorusGeometry(0.26,0.025,8,48),brass);emFrame.position.set(0,0.1,0.5);em.add(emFrame);
var emPlug=mesh(new THREE.CylinderGeometry(0.1,0.12,0.14,24),new THREE.MeshPhysicalMaterial({color:0xc97a2a,roughness:0.3,transmission:0.5,transparent:true,opacity:0.9}));emPlug.position.y=0.8;em.add(emPlug);
var scope=new THREE.Group();scope.position.set(0,0.1,1.1);em.add(scope);
var tube=mesh(new THREE.CylinderGeometry(0.07,0.09,0.7,24),brass);tube.rotation.x=Math.PI/2;scope.add(tube);
var eye=knurl(0.1,0.08,brassDark,16);eye.rotation.x=Math.PI/2;eye.position.z=0.38;scope.add(eye);
var scopePost=mesh(new THREE.CylinderGeometry(0.03,0.03,0.6,12),steel);scopePost.position.set(0,-0.3,0);scope.add(scopePost);
var scopeFoot=mesh(new THREE.CylinderGeometry(0.2,0.22,0.06,24),steel);scopeFoot.position.set(0,-0.6,0);scope.add(scopeFoot);
[0,120,240].forEach(function(deg){var a=deg*Math.PI/180;var ft=mesh(new THREE.SphereGeometry(0.06,12,12),brass);ft.position.set(Math.cos(a)*0.45,-0.57,Math.sin(a)*0.45);em.add(ft)});
var emIons=[];for(var i=0;i<24;i++){var d=new THREE.Mesh(new THREE.SphereGeometry(0.018,6,6),new THREE.MeshBasicMaterial({color:new THREE.Color(0.8,2.2,3.5),transparent:true}));d.visible=false;em.add(d);emIons.push({m:d,live:false})}
var emBallMat=emBall.material=brass.clone();emBallMat.emissive=new THREE.Color(0xffd35a);emBallMat.emissiveIntensity=0;
var emT=0;
function electrometer(){if(!active('em')){emIons.forEach(function(q){q.live=false;q.m.visible=false});return}emT+=0.004;var phase=emT%1;var ang=0.55*Math.max(0.03,1-phase*1.15);if(phase<0.03){ang=0.55;emBallMat.emissiveIntensity=1.5-phase*50}else emBallMat.emissiveIntensity=0;
  leafL.rotation.z=ang;leafR.rotation.z=-ang;
  if(ang>0.05&&frame%6===0){for(var i=0;i<emIons.length;i++)if(!emIons[i].live){var q=emIons[i];q.live=true;q.m.visible=true;q.m.material.opacity=1;q.m.position.set(0.25+(Math.random()-0.5)*0.3,-0.2+Math.random()*0.2,0.1+(Math.random()-0.5)*0.3);q.goal=new THREE.Vector3((Math.random()<0.5?-1:1)*Math.sin(ang)*0.25,0.35-Math.cos(ang)*0.28,0);break}}
  emIons.forEach(function(q){if(!q.live)return;q.m.position.lerp(q.goal,0.035);var d=q.m.position.distanceTo(q.goal);q.m.material.opacity=Math.min(1,d*3);if(d<0.03){q.live=false;q.m.visible=false}});
  if(frame%12===0&&labels.em)labels.em.el.querySelector('small').textContent='leaves at '+Math.round((ang/0.55)*10)+' divisions · falling as the air is ionised'}

/* ---------- 7. magnet test: alphas bend in the field, the mystery radiation does not ---------- */
var mg=new THREE.Group();add(mg,-4.3,0.0,-2.6);
var magRed=new THREE.MeshStandardMaterial({color:0x9b2c1e,roughness:0.5,metalness:0.4}),magGrey=new THREE.MeshStandardMaterial({color:0x6a6e76,roughness:0.45,metalness:0.7});
var yoke=mesh(new THREE.TorusGeometry(0.75,0.16,16,48,Math.PI),magGrey);yoke.rotation.x=Math.PI/2;yoke.rotation.z=Math.PI/2;yoke.position.set(0,0.4,-0.75);mg.add(yoke);
var poleN=mesh(new THREE.BoxGeometry(0.35,0.32,0.8),magRed);poleN.position.set(0,1.05,-0.4);mg.add(poleN);
var poleS=mesh(new THREE.BoxGeometry(0.35,0.32,0.8),magGrey);poleS.position.set(0,-0.25,-0.4);mg.add(poleS);
var mgStand=mesh(new THREE.BoxGeometry(0.9,0.12,1.2),wood);mgStand.position.set(0,-0.48,-0.4);mg.add(mgStand);
/* copper windings around both pole pieces, with terminals and a lead to the switch */
[1.05,-0.25].forEach(function(y){for(var k=0;k<5;k++){var coil=mesh(new THREE.TorusGeometry(0.33,0.035,8,40),copper);coil.position.set(0,y-0.1+k*0.05,-0.4);coil.rotation.x=Math.PI/2;coil.scale.z=1.6;mg.add(coil)}});
[-0.2,0.2].forEach(function(x){var t=mesh(new THREE.CylinderGeometry(0.04,0.04,0.12,12),brass);t.position.set(x,-0.38,0.25);mg.add(t)});
var mgSwitch=mesh(new THREE.BoxGeometry(0.4,0.1,0.3),bakelite);mgSwitch.position.set(0,-0.37,0.5);mg.add(mgSwitch);var mgKnife=mesh(new THREE.BoxGeometry(0.25,0.03,0.05),brass);mgKnife.position.set(0.05,-0.26,0.5);mgKnife.rotation.z=0.5;mg.add(mgKnife);
mg.add(cable([[-0.2,-0.32,0.25],[-0.3,0.0,0.1],[-0.35,0.6,-0.1],[-0.3,0.95,-0.3],[0,1.08,-0.4]],0.025,copper));
mg.add(cable([[0.2,-0.32,0.25],[0.3,-0.3,0.0],[0.32,-0.3,-0.3],[0,-0.28,-0.4]],0.025,copper));
var mgSrc=new THREE.Mesh(new THREE.SphereGeometry(0.07,16,16),new THREE.MeshBasicMaterial({color:new THREE.Color(3,2,0.6)}));mgSrc.position.set(-1.3,0.4,0);mg.add(mgSrc);
var mgSrcLead=mesh(new THREE.BoxGeometry(0.4,0.5,0.5),lead);mgSrcLead.position.set(-1.5,0.4,0);mg.add(mgSrcLead);
var mgScreen=mesh(new THREE.BoxGeometry(0.03,0.7,1.6),new THREE.MeshStandardMaterial({color:0xb9c9a9,roughness:1,envMapIntensity:0.1,side:THREE.DoubleSide}));mgScreen.position.set(1.3,0.4,-0.3);mg.add(mgScreen);
var bendPath=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-1.2,0.4,0),new THREE.Vector3(0.3,0.4,0),new THREE.Vector3(1.28,0.4,-0.75));
var straightPath=new THREE.LineCurve3(new THREE.Vector3(-1.2,0.4,0),new THREE.Vector3(1.28,0.4,0));
var mgA=[],mgN=[];
for(var i=0;i<10;i++){var a=new THREE.Mesh(new THREE.SphereGeometry(0.045,8,8),new THREE.MeshBasicMaterial({color:new THREE.Color(3,2,0.6)}));a.visible=false;mg.add(a);mgA.push({m:a,t:2});
  var n=new THREE.Mesh(new THREE.SphereGeometry(0.045,8,8),new THREE.MeshBasicMaterial({color:new THREE.Color(1.8,1.5,4)}));n.visible=false;mg.add(n);mgN.push({m:n,t:2})}
function magnet(){if(!active('mag')){mgA.concat(mgN).forEach(function(p){p.t=2;p.m.visible=false});return}
  if(frame%9===0){for(var i=0;i<mgA.length;i++)if(mgA[i].t>=1){mgA[i].t=0;mgA[i].m.visible=true;break}}
  if(frame%9===4){for(var i=0;i<mgN.length;i++)if(mgN[i].t>=1){mgN[i].t=0;mgN[i].m.visible=true;break}}
  mgA.forEach(function(p){if(p.t>=1){p.m.visible=false;return}p.t+=0.018;p.m.position.copy(bendPath.getPoint(p.t))});
  mgN.forEach(function(p){if(p.t>=1){p.m.visible=false;return}p.t+=0.018;p.m.position.copy(straightPath.getPoint(p.t))})}

/* ---------- 8. range in air: a sliding zinc-sulphide screen on a ruler; flashes only inside the alpha range ---------- */
var rg=new THREE.Group();add(rg,1.4,0.0,-2.6);
var rulerTex=canvasTex(1024,96,function(g,w,h){g.fillStyle='#e9dfbf';g.fillRect(0,0,w,h);g.strokeStyle='#2a2320';g.lineWidth=2;for(var i=0;i<=60;i++){var x=40+i*16;g.beginPath();g.moveTo(x,96);g.lineTo(x,i%10===0?40:i%5===0?60:76);g.stroke();if(i%10===0){g.fillStyle='#2a2320';g.font='22px serif';g.textAlign='center';g.fillText(String(i/10),x,32)}}g.font='italic 16px serif';g.textAlign='left';g.fillText('cm',10,30)});
var ruler=mesh(new THREE.BoxGeometry(2.6,0.06,0.5),new THREE.MeshStandardMaterial({map:rulerTex,roughness:0.8}));ruler.position.set(0.3,-0.45,0);rg.add(ruler);
var rgLead=mesh(new THREE.BoxGeometry(0.4,0.5,0.5),lead);rgLead.position.set(-1.0,-0.17,0);rg.add(rgLead);
var rgSrc=new THREE.Mesh(new THREE.SphereGeometry(0.07,16,16),new THREE.MeshBasicMaterial({color:new THREE.Color(3,2,0.6)}));rgSrc.position.set(-0.78,-0.17,0);rg.add(rgSrc);
var screenG=new THREE.Group();rg.add(screenG);
var zns=mesh(new THREE.BoxGeometry(0.03,0.6,0.6),new THREE.MeshStandardMaterial({color:0xb9c9a9,roughness:1,emissive:0x1b2a12,emissiveIntensity:0.25,envMapIntensity:0.1,side:THREE.DoubleSide}));zns.position.y=0.0;screenG.add(zns);
var znsFoot=mesh(new THREE.BoxGeometry(0.2,0.08,0.3),brassDark);znsFoot.position.y=-0.38;screenG.add(znsFoot);
var rangeX=-0.78+3.8*0.42;
var rgA=[],rgF=[];
for(var i=0;i<16;i++){var a=new THREE.Mesh(new THREE.SphereGeometry(0.035,8,8),new THREE.MeshBasicMaterial({color:new THREE.Color(3,2,0.6),transparent:true}));a.visible=false;rg.add(a);rgA.push({m:a,t:2,z:0,y:0})}
for(var i=0;i<12;i++){var f=new THREE.Mesh(new THREE.PlaneGeometry(0.08,0.08),new THREE.MeshBasicMaterial({color:new THREE.Color(1.6,2.2,1.3),transparent:true,side:THREE.DoubleSide}));f.rotation.y=Math.PI/2;f.visible=false;screenG.add(f);rgF.push({m:f,life:0})}
var rgT=0;
function rangeDemo(){if(!active('rg')){rgA.forEach(function(p){p.t=2;p.m.visible=false});rgF.forEach(function(f){f.life=0;f.m.visible=false});return}rgT+=0.0035;var sx=0.55+0.95*(0.5+0.5*Math.sin(rgT));screenG.position.set(sx,-0.17,0);var inRange=sx<=rangeX;
  if(frame%4===0){for(var i=0;i<rgA.length;i++)if(rgA[i].t>=1){var p=rgA[i];p.t=0;p.y=(Math.random()-0.5)*0.3;p.z=(Math.random()-0.5)*0.3;p.m.visible=true;break}}
  rgA.forEach(function(p){if(p.t>=1){p.m.visible=false;return}p.t+=0.03;var x=-0.78+(rangeX+0.78)*p.t;if(x>=sx-0.03){p.t=1;p.m.visible=false;for(var i=0;i<rgF.length;i++)if(rgF[i].life<=0){rgF[i].life=1;rgF[i].m.position.set(0.03,p.y,p.z);rgF[i].m.visible=true;break}return}
    p.m.position.set(x,-0.17+p.y,p.z);p.m.material.opacity=1-p.t*0.6});
  rgF.forEach(function(f){if(f.life<=0)return;f.life-=0.08;f.m.material.opacity=f.life;f.m.scale.setScalar(1+(1-f.life)*1.5);if(f.life<=0)f.m.visible=false});
  if(frame%10===0&&labels.rg)labels.rg.el.querySelector('small').textContent='screen at '+((sx+0.78)/0.42).toFixed(1)+' cm · '+(inRange?'flashes':'dark, past the 3.8 cm range')}

/* ---------- 9. oscillograph: a light-beam galvanometer writing recoil pulses onto moving film ---------- */
var osc=new THREE.Group();add(osc,5.6,0.0,-2.4);
osc.add(mesh(new THREE.BoxGeometry(1.3,0.9,1.0),bakelite));
var oscLens=mesh(new THREE.CylinderGeometry(0.1,0.12,0.3,24),brass);oscLens.position.set(0,0.55,0);osc.add(oscLens);
[-0.75,0.75].forEach(function(x){var reel=knurl(0.3,0.08,brassDark,30);reel.position.set(x,0.75,-0.2);reel.rotation.x=Math.PI/2;osc.add(reel)});
/* mirror-galvanometer dome, lamp house, film guide rollers, nameplate */
var oscDome=mesh(new THREE.SphereGeometry(0.28,32,16,0,Math.PI*2,0,Math.PI/2),brass);oscDome.position.set(0,0.45,0.25);osc.add(oscDome);
var oscLamp=mesh(new THREE.CylinderGeometry(0.1,0.1,0.5,20),steel);oscLamp.position.set(0,0.35,-0.55);oscLamp.rotation.x=Math.PI/2;osc.add(oscLamp);
var oscLampGlow=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.02,16),new THREE.MeshBasicMaterial({color:new THREE.Color(3,2.4,1.5)}));oscLampGlow.position.set(0,0.35,-0.29);oscLampGlow.rotation.x=Math.PI/2;osc.add(oscLampGlow);
[-0.45,0.45].forEach(function(x){var roller=mesh(new THREE.CylinderGeometry(0.05,0.05,0.5,16),steel);roller.position.set(x,0.75,-0.2);osc.add(roller)});
[[-0.55,-0.4],[0.55,-0.4],[-0.55,0.4],[0.55,0.4]].forEach(function(c){var ft=mesh(new THREE.CylinderGeometry(0.06,0.07,0.08,12),rubber);ft.position.set(c[0],-0.49,c[1]);osc.add(ft)});
var oscPlate=plate('OSCILLOGRAPH',0.8,0.2,40);oscPlate.position.set(0,-0.25,0.51);osc.add(oscPlate);
[-0.35,0.35].forEach(function(x){var kn=knurl(0.09,0.08,bakelite,14);kn.position.set(x,0.1,0.52);kn.rotation.x=Math.PI/2;osc.add(kn)});
var filmCanvas=document.createElement('canvas');filmCanvas.width=512;filmCanvas.height=160;var fg=filmCanvas.getContext('2d');
fg.fillStyle='#d9d2bd';fg.fillRect(0,0,512,160);
var filmTex=new THREE.CanvasTexture(filmCanvas);filmTex.encoding=THREE.sRGBEncoding;
var film=new THREE.Mesh(new THREE.PlaneGeometry(1.5,0.47),new THREE.MeshBasicMaterial({map:filmTex,side:THREE.DoubleSide}));film.position.set(0,0.75,-0.2);osc.add(film);
var spikeQueue=[];
function filmSpike(h){spikeQueue.push(h)}
function filmScroll(){if(frame%2||!active('osc'))return;fg.drawImage(filmCanvas,-2,0);fg.fillStyle='#d9d2bd';fg.fillRect(510,0,2,160);
  fg.strokeStyle='#4a3a2a';fg.lineWidth=1;for(var y=20;y<160;y+=35){fg.beginPath();fg.moveTo(510,y);fg.lineTo(512,y);fg.stroke()}
  fg.fillStyle='#1a1512';fg.fillRect(510,118,2,2);
  if(spikeQueue.length){var h=spikeQueue.shift();fg.fillRect(508,118-h*100,3,h*100)}
  filmTex.needsUpdate=true}

/* ---------- 10. Geiger tube (Rutherford & Geiger, 1908): one alpha in through the window, one spark along the wire, one click on the register ---------- */
var gt=new THREE.Group();add(gt,-4.3,0.0,2.2);
gt.add(mesh(new THREE.BoxGeometry(2.8,0.12,0.9),wood)).position.y=-0.48;
var gtTube=mesh(new THREE.CylinderGeometry(0.22,0.22,1.4,48,1,true),glass);gtTube.rotation.z=Math.PI/2;gtTube.position.set(0.3,0.1,0);gt.add(gtTube);
[-0.4,1.0].forEach(function(x){var capG=knurl(0.26,0.12,brass,24);capG.rotation.z=Math.PI/2;capG.position.set(x,0.1,0);gt.add(capG)});
var gtWin=mesh(new THREE.CylinderGeometry(0.12,0.12,0.02,24),new THREE.MeshStandardMaterial({color:0x8a7a5a,roughness:0.5,transparent:true,opacity:0.7}));gtWin.rotation.z=Math.PI/2;gtWin.position.set(-0.47,0.1,0);gt.add(gtWin);
var gtWireMat=new THREE.MeshStandardMaterial({color:0xffe9b0,emissive:0xffc050,emissiveIntensity:0.4,metalness:1,roughness:0.2});
var gtWire=mesh(new THREE.CylinderGeometry(0.015,0.015,1.3,8),gtWireMat);gtWire.rotation.z=Math.PI/2;gtWire.position.set(0.3,0.1,0);gt.add(gtWire);
var gtIns=lathe([[0,0],[0.1,0],[0.1,0.15],[0.13,0.17],[0.13,0.25],[0.1,0.27],[0.1,0.4],[0,0.4]],bakelite);gtIns.rotation.z=-Math.PI/2;gtIns.position.set(1.06,0.1,0);gt.add(gtIns);
[[-0.4,-0.35],[1.0,-0.35]].forEach(function(p){var leg=mesh(new THREE.BoxGeometry(0.12,0.5,0.5),brassDark);leg.position.set(p[0],-0.17,0);gt.add(leg);var saddle=mesh(new THREE.TorusGeometry(0.27,0.03,8,32,Math.PI),brassDark);saddle.position.set(p[0],0.1,0);saddle.rotation.y=Math.PI/2;saddle.rotation.z=Math.PI;gt.add(saddle)});
var gtLead=mesh(new THREE.BoxGeometry(0.4,0.5,0.5),lead);gtLead.position.set(-1.05,0.1,0);gt.add(gtLead);
var gtSrc=new THREE.Mesh(new THREE.SphereGeometry(0.06,16,16),new THREE.MeshBasicMaterial({color:new THREE.Color(3,2,0.6)}));gtSrc.position.set(-0.83,0.1,0);gt.add(gtSrc);
/* the mechanical register: a box with four rolling digits and a click lamp */
var reg=new THREE.Group();reg.position.set(0.3,-0.21,0.0);gt.add(reg);
reg.add(rbox(0.7,0.42,0.5,0.02,bakelite));
var regCanvas=document.createElement('canvas');regCanvas.width=256;regCanvas.height=96;var rg2=regCanvas.getContext('2d');
var regTex=new THREE.CanvasTexture(regCanvas);regTex.encoding=THREE.sRGBEncoding;
function drawRegister(n){rg2.fillStyle='#111';rg2.fillRect(0,0,256,96);var s=String(n%10000);while(s.length<4)s='0'+s;for(var i=0;i<4;i++){rg2.fillStyle=i===3?'#e9e0c7':'#ddd6c0';rg2.fillRect(14+i*58,10,50,76);rg2.fillStyle='#111';rg2.font='500 56px "IBM Plex Mono",monospace';rg2.textAlign='center';rg2.fillText(s[i],39+i*58,68)}regTex.needsUpdate=true}
drawRegister(0);
var regFace=new THREE.Mesh(new THREE.PlaneGeometry(0.56,0.21),new THREE.MeshBasicMaterial({map:regTex}));regFace.position.set(0,0.06,0.26);reg.add(regFace);
var regPlate=plate('COUNTS',0.4,0.12,46);regPlate.position.set(0,-0.13,0.25);reg.add(regPlate);
var regLampMat=new THREE.MeshBasicMaterial({color:0x200804});var regLamp=new THREE.Mesh(new THREE.SphereGeometry(0.04,12,12),regLampMat);regLamp.position.set(0.3,0.15,0.26);reg.add(regLamp);
gt.add(cable([[1.2,0.1,0],[1.35,0.0,0.2],[1.1,-0.3,0.35],[0.65,-0.3,0.3]],0.025,cloth));
var gtA=[],gtSparks=[],gtCount=0,gtKick=0;
for(var i=0;i<6;i++){var a=new THREE.Mesh(new THREE.SphereGeometry(0.04,8,8),new THREE.MeshBasicMaterial({color:new THREE.Color(3,2,0.6)}));a.visible=false;gt.add(a);gtA.push({m:a,t:2,y:0,z:0})}
for(var i=0;i<3;i++){var s=new THREE.Mesh(new THREE.SphereGeometry(0.09,12,12),new THREE.MeshBasicMaterial({color:new THREE.Color(2,2.6,4),transparent:true,opacity:0}));s.visible=false;gt.add(s);gtSparks.push({m:s,life:0})}
function geiger(){
  if(!active('gt')){gtA.forEach(function(p){p.t=2;p.m.visible=false});gtSparks.forEach(function(s){s.life=0;s.m.visible=false});return}
  if(frame%38===0){for(var i=0;i<gtA.length;i++)if(gtA[i].t>=1){var p=gtA[i];p.t=0;p.y=(Math.random()-0.5)*0.12;p.z=(Math.random()-0.5)*0.12;p.m.visible=true;break}}
  gtA.forEach(function(p){if(p.t>=1)return;p.t+=0.025;var x=-0.83+p.t*(0.1+0.83);p.m.position.set(x,0.1+p.y,p.z);
    if(p.t>=1){p.m.visible=false;gtCount++;drawRegister(gtCount);gtKick=1;for(var i=0;i<gtSparks.length;i++)if(gtSparks[i].life<=0){var s=gtSparks[i];s.life=1;s.m.visible=true;s.m.position.set(-0.2+Math.random()*0.5,0.1,0);break}}});
  gtSparks.forEach(function(s){if(s.life<=0)return;s.life-=0.07;s.m.material.opacity=s.life;s.m.scale.setScalar(1+(1-s.life)*2);if(s.life<=0)s.m.visible=false});
  gtKick=Math.max(0,gtKick-0.05);gtWireMat.emissiveIntensity=0.4+gtKick*3;regLampMat.color.setRGB(0.12+gtKick*4,0.03+gtKick*0.9,0.02+gtKick*0.4);
  if(frame%10===0&&labels.gt)labels.gt.el.querySelector('small').textContent=gtCount+' alphas counted · one click each'}

/* ---------- labels ---------- */
var tagsEl=document.getElementById('tags');
var labels=[
 {id:'src',pos:new THREE.Vector3(-5.9,1.55,0),h:'Polonium in lead',s:'radioactive source · emits alpha particles'},
 {id:'be',pos:new THREE.Vector3(-3.2,1.5,0),h:'Beryllium disc',s:'alphas hit it · mystery radiation comes out'},
 {id:'tg',pos:new THREE.Vector3(-0.4,1.8,0),h:'Lead wall',s:'the target that gets swapped'},
 {id:'ch',pos:new THREE.Vector3(3.6,1.7,0),h:'Ionisation chamber',s:'brass can of gas · charged particles leave a trail'},
 {id:'amp',pos:new THREE.Vector3(6.7,1.7,2.2),h:'Wynn-Williams amplifier',s:'pulse height = energy · recorded on film'},
 {id:'abs',pos:new THREE.Vector3(1.2,1.6,0),h:'Aluminium absorbers',s:'each foil = a known thickness of air'},
 {id:'cloud',pos:new THREE.Vector3(-1.6,2.1,-2.6),h:'Wilson cloud chamber',s:'photographs the actual tracks'},
 {id:'em',pos:new THREE.Vector3(-7.0,1.75,-2.6),h:'Gold-leaf electrometer',s:'leaves fall as the air is ionised'},
 {id:'mag',pos:new THREE.Vector3(-4.3,1.65,-3.0),h:'Magnet test',s:'alphas bend · the mystery ray goes straight'},
 {id:'rg',pos:new THREE.Vector3(1.6,1.0,-2.6),h:'Range in air',s:'zinc-sulphide screen on a ruler'},
 {id:'osc',pos:new THREE.Vector3(5.6,1.5,-2.4),h:'Oscillograph film',s:'one spike per recoil · height = energy'},
 {id:'gt',pos:new THREE.Vector3(-4.0,1.0,2.2),h:'Geiger tube',s:'one click per particle · counts them one by one'},
 {id:'win',inner:true,pos:new THREE.Vector3(2.4,-0.05,0.6),h:'Thin window',s:'nuclei get in · air stays in',below:true},
 {id:'wire',inner:true,pos:new THREE.Vector3(4.3,0.0,0.3),h:'Central wire  +',s:'held at a few hundred volts · collects electrons',below:true},
 {id:'wall',inner:true,pos:new THREE.Vector3(3.3,1.15,-0.5),h:'Brass wall  −',s:'the gas-filled can · positive ions drift here'}
];
labels.forEach(function(l){var d=document.createElement('div');d.className='tag'+(l.below?' below':'');d.innerHTML=l.h+'<small>'+l.s+'</small>';tagsEl.appendChild(d);l.el=d;labels[l.id]=l});
var v=new THREE.Vector3();
var labelGroup={src:'beam',be:'beam',tg:'beam',abs:'beam',ch:'beam',amp:'beam',win:'beam',wire:'beam',wall:'beam',cloud:'cloud',em:'em',mag:'mag',rg:'rg',osc:'osc',gt:'gt'};
function placeLabels(){var w=stage.clientWidth,h=stage.clientHeight;labels.forEach(function(l){v.copy(l.pos).project(camera);var vis=v.z<1&&(!l.inner||cutaway)&&!l.hide&&active(labelGroup[l.id]);l.el.style.display=vis?'':'none';l.el.style.left=((v.x+1)/2*w)+'px';l.el.style.top=((1-v.y)/2*h)+'px'})}

/* ionisation inside the chamber: a nucleus leaves a trail, electrons fall to the wire, ions drift to the wall, a pulse runs down the cable */
function dotPool(n,rgb,size){var a=[];for(var i=0;i<n;i++){var m=new THREE.Mesh(new THREE.SphereGeometry(size,8,8),new THREE.MeshBasicMaterial({color:new THREE.Color(rgb[0],rgb[1],rgb[2]),transparent:true}));m.visible=false;scene.add(m);a.push({m:m,live:false})}return a}
var electrons=dotPool(60,[1.5,3.5,5],0.03),ions=dotPool(40,[3,1.6,0.6],0.035),tracks=[],pulses=dotPool(4,[5,5,5],0.06);
function startTrack(y,z){if(tracks.length>=3)return;tracks.push({t:0,y:y,z:z})}
function fire(p,fn){for(var i=0;i<p.length;i++)if(!p[i].live){var q=p[i];q.live=true;q.m.visible=true;q.m.material.opacity=1;q.m.scale.setScalar(1);fn(q);return}}
function runIonisation(){
  for(var k=tracks.length-1;k>=0;k--){var tr=tracks[k];tr.t+=0.012;var x=2.45+tr.t*2.0,y=0.55+tr.y,z=tr.z;
    if(frame%2===0){fire(electrons,function(q){q.m.position.set(x,y,z);q.goal=new THREE.Vector3(x,0.55,0);q.sp=0.06+Math.random()*0.04});
      if(frame%4===0)fire(ions,function(q){q.m.position.set(x,y,z);var d=new THREE.Vector3(0,y-0.55,z).normalize();if(d.lengthSq()<0.01)d.set(0,1,0);q.goal=new THREE.Vector3(x,0.55,0).addScaledVector(d,0.78);q.sp=0.012})}
    if(tr.t>=1){tracks.splice(k,1);fire(pulses,function(q){q.t=0})}}
  [electrons,ions].forEach(function(p){p.forEach(function(q){if(!q.live)return;q.m.position.lerp(q.goal,q.sp);var d=q.m.position.distanceTo(q.goal);q.m.material.opacity=Math.min(1,d*4);if(d<0.04){q.live=false;q.m.visible=false}})});
  pulses.forEach(function(q){if(!q.live)return;q.t+=0.03;if(q.t>=1){q.live=false;q.m.visible=false;tick();return}var p=curve.getPoint(q.t);q.m.position.copy(p);q.m.scale.setScalar(1+Math.sin(q.t*Math.PI)*0.8)});
}
function setHot(id){labels.forEach(function(l){l.el.classList.toggle('hot',l.id===id);l.el.classList.toggle('dim',!!id&&l.id!==id)})}

/* ---------- particles (bright colors so they bloom) ---------- */
var modes={
  lead:{rec:false,pass:true,rate:900,frac:1,tag:'Lead wall',tagS:'2 cm of lead · the radiation still gets through'},
  wax:{rec:true,pass:false,rate:200,frac:0.6,speed:0.055,size:1,every:10,tag:'Paraffin wax',tagS:'full of hydrogen · protons get knocked out'},
  n:{rec:true,pass:true,rate:520,frac:1,speed:0.018,size:1.6,every:22,x0:2.7,x1:4.3,tag:'Nitrogen gas',tagS:'heavy nuclei · they recoil slowly'}
};
var mode='lead';
function restartTimer(){if(timer)clearInterval(timer);var m=modes[mode];timer=(cutaway||!active('beam'))?null:setInterval(tick,Math.min(6000,m.rate/Math.max(m.frac,0.04)))}
function pool(n,rgb,size){var arr=[];for(var i=0;i<n;i++){var m=new THREE.Mesh(new THREE.SphereGeometry(size,12,12),new THREE.MeshBasicMaterial({color:new THREE.Color(rgb[0],rgb[1],rgb[2]),transparent:true}));m.visible=false;scene.add(m);arr.push({m:m,t:2,y:0,z:0,sp:0})}return arr}
var alphas=pool(14,[3,2,0.6],0.065),rays=pool(16,[1.8,1.5,4],0.065),passes=pool(8,[1.8,1.5,4],0.065),recoils=pool(10,[4,1.2,0.6],0.12);
function spawn(p,sp,spread,scale){for(var i=0;i<p.length;i++)if(p[i].t>=1){var q=p[i];q.t=0;q.done=false;q.sp=sp;q.y=(Math.random()-0.5)*spread;q.z=(Math.random()-0.5)*spread;q.m.visible=true;q.m.scale.setScalar(scale||1);return}}
function step(p,x0,x1,y0,fade){for(var i=0;i<p.length;i++){var q=p[i];if(q.t>=1){q.m.visible=false;continue}q.t+=q.sp;q.m.position.set(x0+(x1-x0)*q.t,y0+q.y,q.z);q.m.material.opacity=fade?1-q.t:1}}

/* ---------- counter ---------- */
var count=0,countEl=document.getElementById('count'),timer=null,kick={v:0};
function tick(){count++;countEl.textContent=count;filmSpike(mode==='wax'?0.7+Math.random()*0.3:mode==='n'?0.2+Math.random()*0.15:0.3+Math.random()*0.5);if(window.gsap){gsap.killTweensOf(kick);kick.v=1;gsap.to(kick,{v:0,duration:0.7,ease:'elastic.out(1,0.4)'})}else kick.v=1}

window.setMode=function(k){
  mode=k;var m=modes[k];
  ['lead','wax','n'].forEach(function(x){document.getElementById('b-'+x).classList.toggle('on',x===k)});
  setTargetMesh(k);
  labels[2].el.innerHTML=m.tag+'<small>'+m.tagS+'</small>';labels.tg.hide=(k==='n');n2.visible=(k==='n');
  labels.ch.el.innerHTML=k==='n'?'Ionisation chamber<small>now filled with nitrogen · nitrogen nuclei recoil inside it</small>':'Ionisation chamber<small>brass can of gas · charged particles leave a trail</small>';
  restartTimer();
};
setTargetMesh('lead');restartTimer();

/* ---------- camera: OrbitControls when available, with GSAP-driven shots ---------- */
camera.position.set(6,6,12);
var controls=null,orbit={theta:-0.5,phi:1.1,r:14,target:new THREE.Vector3(0.4,0.5,0)};
if(THREE.OrbitControls){controls=new THREE.OrbitControls(camera,renderer.domElement);controls.target.copy(orbit.target);controls.enableDamping=true;controls.dampingFactor=0.06;controls.minDistance=5;controls.maxDistance=28;controls.maxPolarAngle=1.5;controls.autoRotate=true;controls.autoRotateSpeed=0.35;controls.addEventListener('start',function(){controls.autoRotate=false;if(window.gsap)gsap.killTweensOf(camera.position)})}
function shot(theta,phi,r,tx,ty,tz){
  var to=new THREE.Vector3(tx,ty,tz),pos=new THREE.Vector3(tx+r*Math.sin(phi)*Math.sin(theta),ty+r*Math.cos(phi),tz+r*Math.sin(phi)*Math.cos(theta));
  if(controls)controls.autoRotate=false;else{orbit.theta=theta;orbit.phi=phi;orbit.r=r}
  if(window.gsap){gsap.to(camera.position,{x:pos.x,y:pos.y,z:pos.z,duration:1.6,ease:'power3.inOut'});gsap.to(controls?controls.target:orbit.target,{x:tx,y:ty,z:tz,duration:1.6,ease:'power3.inOut'})}
  else{camera.position.copy(pos);(controls?controls.target:orbit.target).copy(to)}
}
function zoomBy(f){
  if(window.gsap)gsap.killTweensOf(camera.position);
  if(controls){controls.autoRotate=false;var d=camera.position.clone().sub(controls.target);var len=Math.min(controls.maxDistance,Math.max(controls.minDistance,d.length()*f));camera.position.copy(controls.target).add(d.setLength(len))}
  else{orbit.r=Math.min(28,Math.max(5,orbit.r*f));placeFallback()}
}
window.zoomBy=zoomBy;
function placeFallback(){camera.position.set(orbit.target.x+orbit.r*Math.sin(orbit.phi)*Math.sin(orbit.theta),orbit.target.y+orbit.r*Math.cos(orbit.phi),orbit.target.z+orbit.r*Math.sin(orbit.phi)*Math.cos(orbit.theta))}
var el=renderer.domElement;
el.addEventListener('wheel',function(e){e.preventDefault();if(!controls)zoomBy(e.deltaY>0?1.08:0.92)},{passive:false});
var pinch=null;
el.addEventListener('touchstart',function(e){if(e.touches.length===2)pinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)},{passive:true});
el.addEventListener('touchmove',function(e){if(e.touches.length===2&&pinch){var d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(!controls)zoomBy(pinch/d);pinch=d}},{passive:true});
el.addEventListener('touchend',function(){pinch=null});
addEventListener('keydown',function(e){if(e.key==='+'||e.key==='=')zoomBy(0.85);if(e.key==='-')zoomBy(1.18)});
if(!controls){var drag=null;el.addEventListener('pointerdown',function(e){drag={x:e.clientX,y:e.clientY};if(window.gsap)gsap.killTweensOf(camera.position)});el.addEventListener('pointermove',function(e){if(!drag)return;orbit.theta-=(e.clientX-drag.x)*0.006;orbit.phi=Math.min(1.5,Math.max(0.35,orbit.phi-(e.clientY-drag.y)*0.005));drag={x:e.clientX,y:e.clientY};placeFallback()});el.addEventListener('pointerup',function(){drag=null});el.style.touchAction='none'}

/* ---------- bloom ---------- */
var composer=null,bloom=null;
if(THREE.EffectComposer&&THREE.UnrealBloomPass&&THREE.RenderPass){
  composer=new THREE.EffectComposer(renderer);composer.addPass(new THREE.RenderPass(scene,camera));
  bloom=new THREE.UnrealBloomPass(new THREE.Vector2(1,1),0.7,0.55,0.9);composer.addPass(bloom);
}

/* ---------- story ---------- */
var steps=[
 {hot:'em',mode:'lead',cam:[-0.3,1.05,5.0,-7.0,0.5,-2.6],title:'The gold-leaf electroscope: how it works',
  text:'The jar in front of you was the radiation meter of the 1900s and it has no electronics at all. A brass rod runs down through an insulating plug in the cap, and two leaves of gold foil, each thinner than a hair, hang from its bottom. Touch the brass ball on top with a charged rod and the charge spreads over rod and leaves. Both leaves now carry the <b>same sign of charge</b>, like charges repel, and the leaves swing apart. The insulator stops the charge leaking away, so the leaves should stay open forever. They stay open only while the air inside is a perfect insulator.<div class="math"><em>Why gold, and why foil</em>\nGold does not tarnish, so the leaves stay conducting, and\nfoil at 0.1 μm is so light that a few nanocoulombs can lift it.\n\n<em>Charge on the leaves</em>  q = C·V   with C ≈ 1 pF for the rod\n  at V = 2000 V:  q ≈ 2 nC  ≈ 1.2 × 10¹⁰ electrons\n\n<em>The repulsion that opens them</em>\n  F = k q₁q₂ / r²  — half the charge on each leaf, a few\n  millimetres apart, is enough to beat gravity on 0.1 mg of gold.\n\n<em>The scale</em>  a glass window and a marked card behind the\nleaves, read with a low-power microscope: 10 divisions = fully open.</div>'},
 {hot:'em',mode:'lead',cam:[-0.6,1.0,4.6,-7.0,0.4,-2.6],title:'Using it to measure polonium',
  text:'Now put a speck of <b>polonium</b> inside the jar, on the little tray. Every alpha it fires ionises thousands of air molecules into pairs of a free electron and a positive ion. The charged leaves attract whichever sign is opposite to their own, those ions (blue) drift across, land on the gold and cancel its charge, and the leaves sink. The stronger the source, the more ions per second, and the faster the leaves fall. Time the fall from 10 divisions to 5 with a stopwatch, come back every few weeks, and the fall takes twice as long after 138 days: that is the half-life.<div class="math"><em>What the leaf speed measures</em>\n  ionisation current  i = (ions per second) × e\n  one 5.3 MeV alpha  →  5.3e6 / 34 ≈ 1.6 × 10⁵ ion pairs\n  a 1 μCi speck, 3.7e4 alphas/s  →  i ≈ 1 × 10⁻¹² A\n\n<em>Turning that into a half-life</em>\n  leaf fall rate  ∝  i  ∝  activity A(t)\n  A(t) = A₀ · 2^(−t/T)\n  day 0: 10 → 5 divisions in 60 s\n  day 138: the same fall takes 120 s   →   <b>T = 138 days</b>\n\n<em>Same instrument, same year</em>  Marie Curie found polonium\nin 1898 by this exact method, following which chemical fraction\nof pitchblende made the leaves fall fastest.</div>'},
 {hot:'mag',mode:'lead',cam:[-0.2,1.1,5.6,-4.3,0.4,-2.8],title:'What an alpha particle is, and how they weighed it',
  text:'An alpha is a bare <b>helium nucleus</b>: two protons and two neutrons, charge +2, mass about 4 atomic units. Nobody could see one, so its charge and mass came from two tricks Rutherford used in 1908. The magnet in front of you shows the second: the amber alphas curve between the poles while anything uncharged flies straight to the screen.<div class="math"><em>Charge</em>  count the particles one by one with an early\nGeiger tube, catch the same beam in a metal cup wired to an\nelectrometer, and divide total charge by the count:\n  Q / N ≈ 3.2 × 10⁻¹⁹ C = <b>2 × e</b>\n\n<em>Mass</em>  send the beam between magnet poles. A charge q moving\nat speed v in a field B bends on a circle of radius r:\n  r = m v / (q B)      <em>bigger mass, gentler bend</em>\nMeasure r, and with q known the bend gives m/v. A second bend\nin an electric field separates m from v: <b>m ≈ 4 u</b>.</div>'},
 {hot:'gt',mode:'lead',cam:[0.2,1.05,4.5,-4.0,0.2,2.2],title:'Counting alphas one at a time: the Geiger tube',
  text:'Before 1908 radiation could only be measured as a total, like the brightness of a lamp. Rutherford and Geiger wanted to <b>count the single particles</b>. The tube in front of you is a can of gas with a thin wire down the middle and a high voltage between wire and wall. One alpha comes in through the small window and knocks a few electrons off the gas. The voltage whips those electrons into more gas atoms, each of those frees more, and in a flash the tiny trail becomes a <b>spark</b> along the wire. One particle in, one spark out. Every spark gives a small jolt to the register on the right, which adds one. That is the <b>count</b>. The <b>charge</b> comes from a second, separate run: take the tube away, put a small metal cup in the same spot, wire the cup to the electroscope, and let the beam run for the same time. The alphas land in the cup and their charge piles up, so the leaves open by an amount that tells you the total charge. Total charge divided by the number of clicks is the charge of one alpha.<div class="math"><em>count</em>    register reads N clicks in one minute\n<em>charge</em>   cup catches Q coulombs in one minute\n\n<em>one alpha</em>   Q / N = 3.2 × 10⁻¹⁹ C = <b>2 e</b>\n(e is the charge of one electron, 1.6 × 10⁻¹⁹ C)\n\n<em>why a spark from one atom-sized particle</em>\n  one alpha  →  a few thousand electrons\n  high voltage  →  avalanche  →  ×1000 or more\n  big enough to click a register</div>'},

 {hot:'rg',mode:'lead',cam:[-0.5,0.9,6.5,1.4,0.0,-2.6],title:'How alpha energy was measured: range in air',
  text:'An alpha in air is like a bullet in water. It ploughs ahead, losing energy to every molecule it passes, and then stops dead at a sharp, repeatable distance called its <b>range</b>. Watch the screen in front of you slide along the ruler: while it is closer than <b>3.8 cm</b> every alpha makes a flash, and once it passes that mark it goes dark. Every alpha from Po-210 has the same range, so they all have the same energy.<div class="math"><em>Geiger\'s rule (1910)</em>   range  R ∝ v³\nCalibrated once against a magnet-measured alpha, so from\nthen on a range read off a ruler gives a speed:\n  R = 3.8 cm  →  v ≈ 1.6 × 10⁷ m/s\n  E = ½ m v² = ½ × 6.6e-27 × (1.6e7)² ≈ 8.5e-13 J\n  1 eV = 1.6e-19 J  →  <b>E ≈ 5.3 MeV</b></div>'},
 {hot:'be',mode:'lead',cam:[-0.7,1.1,7,-3.0,0.5,0],focus:['beam'],ui:['legend'],title:'Bookkeeping at the beryllium',
  text:'When an alpha hits a <b>beryllium-9</b> nucleus, the two merge and something flies out. Nuclear reactions keep two tallies, charge and mass number, and the leftover nucleus was known to be carbon-12. Doing the sums tells you what the mystery must look like before you ever detect it.<div class="math"><em>charge</em>   2 (He) + 4 (Be) = 6 (C) + <b>0</b>   → it is neutral\n<em>mass</em>     4 (He) + 9 (Be) = 12 (C) + <b>1</b>  → one unit of mass\n\n⁴He + ⁹Be → ¹²C + ¹n  <em>(the reaction, written today)</em></div>'},
 {hot:'mag',mode:'lead',cam:[-0.2,1.1,5.6,-4.3,0.4,-2.8],title:'1930: it goes through lead, and a magnet ignores it',
  text:'Bothe and Becker did two tests. They put the radiation through a strong <b>magnet</b>, the same test as in front of you, and the violet beam hit the screen in exactly the same place with the field on or off, so whatever it was carried no charge. Then they stacked <b>lead sheets</b> in front of their counter and watched the rate fall slowly, sheet by sheet, the way gamma rays do, instead of cutting off sharply the way charged particles do.<div class="math"><em>Absorption curve</em>   count behind thickness x of lead\n  I(x) = I₀ · e^(−μx)\nPlot ln(I) against x: a straight line means a gamma-like\npenetrating ray. Their line stayed straight through 2 cm of\nlead, so they wrote it up as gamma radiation.</div>'},
 {hot:'tg',mode:'wax',cam:[-0.35,1.05,7.5,-0.2,0.5,0],focus:['beam'],ui:['targets','counter','legend'],title:'1932: protons come out of the wax',
  text:'The Joliot-Curies used an <b>ionisation chamber</b> wired to a Hoffmann electrometer, which measures the current from all the charge collected in the can. When they put <b>paraffin wax</b>, a hydrocarbon packed with hydrogen, in front of the window, the current jumped. A thin sheet of foil between wax and window killed the extra current, so the new particles were charged and short-ranged, and a magnet bent them the way <b>protons</b> bend.'},
 {hot:'abs',mode:'wax',cam:[0.1,1.0,6.5,1.2,0.5,0],focus:['beam'],ui:['targets','foils','counter','legend'],title:'Measuring the proton range with foils',
  text:'Nobody could watch a proton fly 40 cm through air on a bench, so they used <b>aluminium foils</b>. Each foil of known thickness stops a particle exactly as much as a known length of air does, its <b>air-equivalent</b>. Slide foils into the beam one at a time, count behind each, and the count reaches zero at the range. Try it with the + and − buttons on the right.<div class="math"><em>Rule of thumb used in 1932</em>\n  0.01 mm of aluminium  ≈  1.6 cm of air\n  5 foils stop everything  →  range ≈ <b>40 cm of air</b>\n\n<em>Range to speed</em>   Blackett\'s cloud-chamber curve for\nprotons (1932): a 40 cm track ↔ <b>v = 3.3 × 10⁷ m/s</b>\n  E = ½ × 1.67e-27 × (3.3e7)² ≈ 9e-13 J ≈ <b>5.7 MeV</b></div>'},
 {hot:'tg',mode:'wax',cam:[-0.1,1.0,7,-0.2,0.5,0],focus:['beam'],ui:['targets','legend'],title:'Why a photon cannot do that',
  text:'A photon has energy but very little momentum, so bouncing one off a heavy proton is like throwing a ping-pong ball at a bowling ball. The <b>Compton formula</b>, already tested on electrons, says how much energy a photon can hand to a particle of rest energy Mc². Put in the proton\'s 5.7 MeV and the photon would need about 55 MeV, while the whole alpha-plus-beryllium reaction only has about 11 MeV to give.<div class="math"><em>Compton, maximum recoil energy</em>\n  T = 2E² / (Mc² + 2E)        Mc² = 938 MeV for a proton\n  5.7 = 2E² / (938 + 2E)  →  2E² − 11.4E − 5347 = 0\n  <b>E ≈ 55 MeV</b>\n\n<em>energy available</em>   5.3 (alpha) + 5.7 (reaction) ≈ 11 MeV\n<em>shortfall</em>           5 × too little</div>'},
 {hot:'ch',mode:'n',cut:true,cam:[0.45,1.05,6.5,3.6,0.5,0],focus:['beam'],ui:['targets','counter','legend'],title:'Chadwick swaps in nitrogen',
  text:'Chadwick\'s move was to repeat the measurement with a target of a different weight. He took the wax away and filled the <b>ionisation chamber itself with nitrogen</b>, so the recoils now happen inside the can, and read their energies from the pulse sizes, and his colleague Norman Feather photographed nitrogen recoils in a cloud chamber. A nitrogen nucleus has mass 14, so the same push leaves it moving slowly and its track is only a few millimetres long.<div class="math"><em>cloud-chamber track</em>   ≈ 3.5 mm of air\n<em>range to speed</em>        <b>u = 4.7 × 10⁶ m/s</b>\n<em>recoil energy</em>         ½ × 14 × 1.67e-27 × u² ≈ <b>1.2 MeV</b>\n\n<em>Compton again</em>   Mc² = 13 040 MeV for nitrogen\n  1.2 = 2E² / (13040 + 2E)  →  <b>E ≈ 90 MeV</b>\n\n55 MeV ≠ 90 MeV   <em>same beam, two different answers</em></div>'},
 {hot:'ch',mode:'n',cut:true,cam:[0.3,1.0,7,3.0,0.5,0],focus:['beam'],ui:['targets','legend'],title:'The billiard-ball equation',
  text:'Now assume a <b>particle</b> of unknown mass M and speed V hits a target of mass m head-on, like one billiard ball striking another. Conservation of energy and momentum gives the fastest the target can recoil. Write it for both targets, divide, and V cancels out, leaving only M.<div class="math">u_max = 2MV / (M + m)\n\n<em>wax</em>       u_p = 2MV / (M + 1)\n<em>nitrogen</em>  u_N = 2MV / (M + 14)\n\nu_p / u_N = (M + 14) / (M + 1) = 3.3e7 / 4.7e6 ≈ 7\n\nM + 14 = 7M + 7   →   6M = 7   →   <b>M ≈ 1.15</b>\n<em>Chadwick\'s value; refined to 1.0067 within months</em></div>'},
 {hot:'cloud',mode:'n',cam:[0.9,1.15,6.5,-1.6,0.3,-2.6],title:'The cloud chamber: seeing a track with your own eyes',
  text:'C. T. R. Wilson\'s chamber (1911) is a glass drum full of air saturated with water or alcohol vapour. A <b>piston</b> underneath drops suddenly, the air expands and cools, and the vapour wants to condense but has nothing to condense on. A charged particle passing through leaves a line of ions, droplets form on every ion, and for a fraction of a second the path hangs in the air as a white thread. A <b>camera</b> above fires a flash and photographs it.<div class="math"><em>What a photograph gives you</em>\n  track length        → the range, read with a ruler\n  track thickness     → how heavily it ionises (mass, charge)\n  curvature in a      → momentum:  p = q B r\n  magnetic field\n\nLong thin tracks here are protons, short fat ones are\nnitrogen recoils. Feather measured 3.5 mm nitrogen tracks.</div>'},
 {hot:'ch',mode:'n',cut:true,cam:[0.55,1.1,5.2,3.6,0.5,0.3],focus:['beam'],ui:['counter','legend'],title:'Inside the ionisation chamber',
  text:'The chamber is cut open here. It is a brass can of gas with a <b>wire down the middle</b>, and a battery holds the wire a few hundred volts positive relative to the wall. A recoiling nucleus enters through the thin window and, because it is charged, it tears electrons off the gas molecules along its path. The <b>electrons</b> (blue) are pulled to the wire and the heavier <b>positive ions</b> (amber) drift out to the wall. The neutron itself does none of this; only the nucleus it struck leaves a trail.<div class="math"><em>energy to ionise one air molecule</em>   ≈ 34 eV\n<em>a 1.2 MeV nitrogen recoil</em>            1.2e6 / 34 ≈ <b>35 000 ion pairs</b>\n<em>charge on the wire</em>                  35 000 × 1.6e-19 C ≈ 6e-15 C\n<em>that is the pulse the amplifier sees</em></div>'},
 {hot:'osc',mode:'n',cut:false,cam:[0.25,1.05,5,5.6,0.5,-2.4],focus:['beam','osc'],ui:['targets','counter'],title:'Turning a pulse into a number on film',
  text:'Six femtocoulombs is far too small to see, so Chadwick used the new <b>Wynn-Williams linear amplifier</b>, a chain of radio valves that multiplied each pulse by thousands while keeping its size proportional to the charge. The output drove an <b>oscillograph</b>, a mirror galvanometer whose light beam wrote on a strip of moving photographic film. Each recoil became one spike on the film strip in front of you, and the height of the spike was the recoil energy. Switch between wax and nitrogen and watch the spikes change height.<div class="math"><em>Reading the film</em>\n  spike height  ∝  charge collected  ∝  ion pairs  ∝  energy\n  calibrate once with alphas of known 5.3 MeV\n  the tallest spike in a run = the fastest recoil\n\nThe "fastest recoil" numbers in this story are the tallest\nspikes Chadwick measured with a ruler on developed film.</div>'},
 {hot:'ch',mode:'wax',cut:true,cam:[0.3,1.05,5.2,3.6,0.5,0.3],focus:['beam'],ui:['targets','counter','legend'],title:'Why the trail length matters',
  text:'A faster nucleus leaves a longer trail and more ion pairs, so the <b>size of the pulse</b> reports the energy of each recoil. Switching the target changes what you see in the can: protons from wax make long thin tracks, nitrogen nuclei make short dense ones. Range in foils, track length in the cloud chamber and spike height on film are three independent ways of measuring the same recoil energy, and Chadwick used all three so that no single instrument could fool him.'},
 {hot:null,mode:'n',cam:[-0.5,1.1,14,0.4,0.5,0],title:'The neutron',
  text:'One neutral particle with mass about 1 explains everything at once: it passes through lead because it has no charge, it knocks protons hard because it weighs the same as a proton, and it pushes nitrogen gently because nitrogen is 14 times heavier. Chadwick sent the paper to Nature on 17 February 1932 and received the Nobel Prize in 1935. The neutron explained why atoms weigh more than their protons alone, and within a decade it made nuclear fission and reactors possible.'}
];
var cur=0,dots=document.getElementById('dots');
/* a step shows only its own instrument: other demos freeze, their labels hide, and only the UI it needs is on screen */
function active(id){var s=steps&&steps[cur];if(!s)return true;return !s.hot||(s.focus||[s.hot]).indexOf(id)>=0}
var uiPanels={targets:'targetsUI',foils:'foilsUI',counter:'counterUI',legend:'legendUI'};
steps.forEach(function(){var i=document.createElement('i');dots.appendChild(i)});
function show(i){cur=i;var s=steps[i];
  document.getElementById('s-step').textContent='Step '+(i+1)+' of '+steps.length;
  var t=document.getElementById('s-title'),p=document.getElementById('s-text');
  t.textContent=s.title;var parts=s.text.split('<div class="math">');p.innerHTML='<span class="prose">'+parts[0]+'</span>'+(parts[1]?'<div class="math">'+parts[1]:'');p.classList.toggle('two',!!parts[1]);p.scrollTop=0;
  if(window.gsap)gsap.fromTo([t,p],{opacity:0,y:8},{opacity:1,y:0,duration:0.5,stagger:0.08,ease:'power2.out'});
  Array.prototype.forEach.call(dots.children,function(d,j){d.classList.toggle('on',j===i)});
  document.getElementById('prev').disabled=i===0;document.getElementById('next').disabled=i===steps.length-1;
  Object.keys(uiPanels).forEach(function(k){document.getElementById(uiPanels[k]).hidden=!!s.hot&&(s.ui||[]).indexOf(k)<0});
  setHot(s.hot);if(mode!==s.mode)setMode(s.mode);if(!!s.cut!==cutaway)setCutaway(!!s.cut);restartTimer();shot.apply(null,s.cam)}
window.go=function(d){show(Math.min(steps.length-1,Math.max(0,cur+d)))};
show(0);

/* ---------- story card: drag it by its header, resize it from the top-right grip ---------- */
(function(){var story=document.querySelector('.story'),card=story.querySelector('.card'),head=card.querySelector('.head');
var grip=document.createElement('div');grip.className='grip';grip.title='Drag to resize';card.appendChild(grip);
function pin(){var r=story.getBoundingClientRect(),h=card.getBoundingClientRect().height;story.style.left=r.left+'px';story.style.top=r.top+'px';story.style.bottom='auto';story.style.width=r.width+'px';story.style.paddingBottom='0';card.style.maxHeight='none';card.style.boxSizing='border-box';card.style.height=h+'px'}
function track(el,onMove){el.addEventListener('pointerdown',function(e){if(e.target.closest('button'))return;e.preventDefault();pin();var sx=e.clientX,sy=e.clientY,r=story.getBoundingClientRect(),h=card.getBoundingClientRect().height;el.setPointerCapture(e.pointerId);
  function mv(ev){onMove(ev.clientX-sx,ev.clientY-sy,r,h)}function up(){el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up)}el.addEventListener('pointermove',mv);el.addEventListener('pointerup',up)})}
track(head,function(dx,dy,r){story.style.left=Math.max(0,Math.min(innerWidth-80,r.left+dx))+'px';story.style.top=Math.max(0,Math.min(innerHeight-60,r.top+dy))+'px'});
track(grip,function(dx,dy,r,h){var nh=Math.max(140,h-dy);story.style.width=Math.max(300,r.width+dx)+'px';card.style.height=nh+'px';story.style.top=(r.top+(h-nh))+'px'});
})();

/* ---------- loop ---------- */
var frame=0,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function resize(){var w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(composer)composer.setSize(w,h)}
addEventListener('resize',resize);resize();
function animate(){
  requestAnimationFrame(animate);frame++;
  if(controls)controls.update();else camera.lookAt(orbit.target);
  placeLabels();
  var m=modes[mode];var beamOn=active('beam');
  if(!beamOn){[alphas,rays,passes,recoils].forEach(function(p){p.forEach(function(q){q.t=1})});tracks.length=0;[electrons,ions,pulses].forEach(function(p){p.forEach(function(q){q.live=false;q.m.visible=false})})}
  if(beamOn&&(!reduced||frame%4===0)){
    if(frame%5===0)spawn(alphas,0.05,0.35);
    if(frame%6===0)spawn(rays,0.035,0.5);
    if(m.pass&&frame%16===0)spawn(passes,0.03,0.4);
    if(m.rec&&frame%m.every===0){spawn(recoils,m.speed,0.7,m.size);recoils.forEach(function(q){if(q.t===0)q.cut=Math.random()>m.frac})}
  }
  recoils.forEach(function(q){if(q.cut&&q.t<1&&q.m.position.x>=1.15){q.t=1;q.m.visible=false}});
  cloudTracks();electrometer();magnet();rangeDemo();filmScroll();geiger();
  step(alphas,-4.6,-3.3,0.5);step(rays,-3.1,-0.85,0.55);step(passes,0.0,2.35,0.55,true);step(recoils,m.x0||0.0,m.x1||2.35,0.55);
  recoils.forEach(function(q){if(q.t>=1&&!q.done){q.done=true;if(cutaway)startTrack(q.y*0.6,q.z*0.6)}});
  if(beamOn&&cutaway&&!m.rec&&frame%70===0)startTrack((Math.random()-0.5)*0.6,(Math.random()-0.5)*0.6);
  runIonisation();
  poLight.intensity=1.2+Math.sin(frame*0.1)*0.35;
  needlePivot.rotation.z=-kick.v*0.85;
  lampMat.color.setRGB(0.12+kick.v*4,0.03+kick.v*0.9,0.02+kick.v*0.4);
  if(composer)composer.render();else renderer.render(scene,camera);
}
animate();
})();
