// Shoot 3D - Wireframe Magazine
// Written by Mark Vanstone Nov 2019

var s3d = {};
var plasmaBalls = [];
window.addEventListener("mousedown", fireGuns);
window.addEventListener("touchstart", fireGuns);
var speed = 500;
var countclock = null;
var delta = 0;
var score = 0;
setInterval(displayScore,1000);
var laser = new Audio('sound/laser.wav');
var explosion = new Audio('sound/explosion.wav');

function displayScore(){
  document.getElementById("score").innerHTML="SCORE<br>"+score;
}

function setup3D(w,h){
  // Setup the whole 3D scene with camera, renderer, controls, objects and lights
  // and store in the s3d object
  s3d.scene = new THREE.Scene(); 
  countclock = new THREE.Clock();
  s3d.camera = new THREE.PerspectiveCamera( 45, w / h, 0.1, 2000 );
  var gamearea = document.getElementById('gamearea');
  s3d.renderer = new THREE.WebGLRenderer({ canvas: gamearea, antialias: true });
  s3d.renderer.setSize(w, h);
  s3d.controls = new THREE.OrbitControls( s3d.camera, s3d.renderer.domElement );
  s3d.controls.target.set(0,0,5);
  s3d.controls.enableZoom = false;
  s3d.controls.enablePan = false;
  s3d.controls.update();
  var plight = new THREE.PointLight(0xffffff,1);
  plight.position.set( 0, 0, -10 );
  s3d.scene.add( plight );
  addSkyBox();
  loadObjects();
}

function addSkyBox(){
  // Skybox images from https://opengameart.org/
  let images = ["posx","negx","posy","negy","posz","negz"];
  let materialArray = [];
  for(let m = 0; m < 6; m++){
    materialArray.push(new THREE.MeshBasicMaterial( { 
      map: new THREE.TextureLoader().load('images/sky/'+images[m]+'.jpg') 
    }));
  }
  for (let m = 0; m < 6; m++) materialArray[m].side = THREE.BackSide;
  let skybox = new THREE.Mesh( new THREE.BoxGeometry( 2000, 2000, 2000), materialArray );
  s3d.scene.add( skybox );
  skybox.position.set(0,0,0);
}
  
function animate() {
  // Set the scene rendering
  requestAnimationFrame( animate );
  s3d.renderer.render( s3d.scene, s3d.camera );
}

function newGunBarrel(x,y,z){
  // This creates the invisible cubes that we start the bullets from
  var gb = new THREE.Mesh(new THREE.CubeGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  gb.material.transparent = true;
  gb.material.opacity = 0;
  s3d.gun.add(gb);
  gb.position.set(x,y,z);
  return gb;
}

function loadObjects(){
  // Load our models from files, setup our guns and 
  // make a function to update the scene objects
  var loader = new THREE.GLTFLoader();
  loader.load( 'models/guns.glb', function ( gltf ) {
    s3d.scene.add( gltf.scene );
    s3d.gun = gltf.scene;
    s3d.gunbarrels = [];
    s3d.gunbarrels[0] = newGunBarrel(2.8,1.8,-8);
    s3d.gunbarrels[1] = newGunBarrel(-2.8,1.8,-8);
    s3d.gunbarrels[2] = newGunBarrel(-5,-1.8,-8);
    s3d.gunbarrels[3] = newGunBarrel(5,-1.8,-8);
  }, undefined, function ( error ) {
      console.error( error );
  });
  loader.load( 'models/alien.glb', function ( gltf ) {
    s3d.scene.add( gltf.scene );
    s3d.alien = gltf.scene;
    s3d.alien.position.set((Math.random()*1000)-500,300,1040);
    s3d.alien.shields = 300;
  }, undefined, function ( error ) {
      console.error( error );
  });
  s3d.scene.onBeforeRender = function(){
    // the BeforeRender event is a good place to do updates to the scene
    if(s3d.gun){
      s3d.gun.position.copy( s3d.camera.position );
      s3d.gun.rotation.copy( s3d.camera.rotation );
      s3d.gun.updateMatrix();
      s3d.gun.translateZ( - 5 );
    }
    delta = countclock.getDelta();
    plasmaBalls.forEach(b => {
      if(!b.col) b.translateZ(-speed * delta); // move along the local z-axis
      if(checkCollision(b, s3d.alien)){
        // this bullet just hit an alien!
        explosion.play();
        score += 10
        s3d.alien.shields -= 1;
        s = Math.random()*30;
        b.scale.set(s,s,s);
        b.col = 255;
        // turn the bullet yellow
        var color = new THREE.Color("rgb(255, 255, 0)");
        b.material.color.set(color);
      }
      if(b.col){
        // gradually make the bullet go back to red
        b.col -=20;
        if(b.col < 20){
          // when its back to red remove the bullet
          s3d.scene.remove(b);
        }else{
          // make the bullet move erratically to simulate explosion
          var color = new THREE.Color("rgb(255, "+b.col+", 0)");
          b.material.color.set(color);
          b.translateX((Math.random()*4)-2);
          b.translateY((Math.random()*4)-2);
        }
      }
    });
    if(s3d.alien){
      // if the alien object is in play, move it
      s3d.alien.rotation.y +=  (300-s3d.alien.shields)/1000;
      s3d.alien.position.z -= 2;
      if(s3d.alien.position.z < -1000 || s3d.alien.shields < 0){
        // The alien has either reached the other side or has been shot down
        s3d.alien.position.z = 1040;
        s3d.alien.position.x = (Math.random()*1000)-500;
        if(s3d.alien.shields < 0){
          score += 1000;
        }
        s3d.alien.shields = 300;
        s3d.alien.rotation.y = 0;
        // Take the opportunity to clean down our bullet list
        cleanBullets();
      }
    }
  };
}

function checkCollision(a,b){
  // is a bullet inside the bounding cube of the alien?
  if((a.position.x > b.position.x-20 && a.position.x < b.position.x+20) && (a.position.y > b.position.y-10 && a.position.y < b.position.y+10) && (a.position.z > b.position.z-30 && a.position.z < b.position.z+30)){
    return true;
  }
  return false;
}

function fireGuns() {
  // create one bullet per barrel
  laser.play();
  for(gb=0;gb<4;gb++){
    newBullet(s3d.gunbarrels[gb]);
  }
}

function cleanBullets(){
  // remove unwanted bullets from the list
  var newPlasma = [];
  plasmaBalls.forEach(b => {
    if(!b.col && b.position.z > -1000){
      newPlasma.push(b);
    }else{
      s3d.scene.remove(b);
    }
  });
  plasmaBalls = newPlasma;
}

function newBullet(gb){
  // make a new bullet at the location of the object supplied (gb)
  let plasmaBall = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 4), new THREE.MeshBasicMaterial({
    color: "red"
  }));
  plasmaBall.position.copy(gb.getWorldPosition(new THREE.Vector3())); // start position - the tip of the weapon
  plasmaBall.quaternion.copy(s3d.camera.quaternion); // apply camera's quaternion
  s3d.scene.add(plasmaBall);
  plasmaBalls.push(plasmaBall);
}